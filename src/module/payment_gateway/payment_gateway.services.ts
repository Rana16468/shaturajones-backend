import Stripe from "stripe";
import { JwtPayload } from "jsonwebtoken";
import httpStatus from "http-status";
import { Types } from "mongoose";
import mongoose from "mongoose";
import config from "../../app/config";
import users from "../user/user.model";
import { USER_ACCESSIBILITY, USER_ROLE } from "../user/user.constant";
import ApiError from "../../app/error/ApiError";
import services from "../services/services.model";
import payments from "./payment_gateway.model";
import { payment_method, payment_search_filed, payment_status } from "./payment_gateway.constant";
import { getSocketIO } from "../../socket/connectSocket";
import notifications from "../notification/notification.model";
import catchError from "../../app/error/catchError";
import QueryBuilder from "../../app/builder/QueryBuilder";
import { cache } from "../createJobs/createJobs.constant";
import JobsServices from "../services/services.services";



const stripe = new Stripe(
  config.stripe_payment_gateway.stripe_secret_key as string
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentDetails {
  price: number;
  serviceId?: string;
  bookingData?: {
    jobId: string;
    selectedDate: string;
    availablePackagesService?: Array<{ availablePackageId: string; isDelete?: boolean }>;
    addOnsService?: Array<{ addOnsId: string; isDelete?: boolean }>;
  };
  description?: string;
}

interface UserDocument {
  _id: Types.ObjectId;
  stripeAccountId?: string;
  email: string;
}

// ─── Helper: Create New Stripe Account + Onboarding Link ─────────────────────

const createNewStripeAccountAndLink = async (
  email: string,
  userId: string
): Promise<{ onboardingUrl: string }> => {
  const account = await stripe.accounts.create({
    type: "express",
    email,
    country: "US",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: "individual",
    settings: {
      payouts: {
        schedule: {
          interval: "manual",
        },
      },
    },
  });

  const onboardingLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${config.stripe_payment_gateway.onboarding_refresh_url}?accountId=${account.id}`,
    return_url: config.stripe_payment_gateway.onboarding_return_url,
    type: "account_onboarding",
  });

  

  const updatedUser = await users.findOneAndUpdate(
    {
      _id: userId,
      isVerify: true,
      status: USER_ACCESSIBILITY.isProgress,
      
    },
    { $set: { stripeAccountId: account.id,isStripeConnected: true  } },
    { new: true }
  );

  if (!updatedUser) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to store Stripe account ID in database",
      ""
    );
  }

  return { onboardingUrl: onboardingLink.url };
};

// ─── Main Service ─────────────────────────────────────────────────────────────

const createConnectedAccountAndOnboardingLinkIntoDb = async (
  userData: JwtPayload
): Promise<
  | { onboardingUrl: string }
  | { card_payments?: string; transfers?: string }
> => {

 
  const normalUser = await users.findOne(
    {
      _id: userData.id,
      isVerify: true,
      status: USER_ACCESSIBILITY.isProgress,
    },
    { _id: 1, stripeAccountId: 1, email: 1 }
  );
  
  if (!normalUser) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "User not found or restricted",
      ""
    );
  }

  // ─── CASE 1: User already has Stripe account ───────────────────────────────
  if (normalUser.stripeAccountId) {
    const onboardingLink = await stripe.accountLinks.create({
      account: normalUser.stripeAccountId,
      refresh_url: `${config.stripe_payment_gateway.onboarding_refresh_url}?accountId=${normalUser.stripeAccountId}`,
      return_url: config.stripe_payment_gateway.onboarding_return_url,
      type: "account_onboarding",
    });

    const account = await stripe.accounts.retrieve(normalUser.stripeAccountId);

    const cardPayments = account.capabilities?.card_payments;
    const transfers = account.capabilities?.transfers;

    // If both inactive → reset account and recreate
    if (cardPayments === "inactive" && transfers === "inactive") {
      await users.findOneAndUpdate(
        {
          _id: userData.id,
          isVerify: true,
          status: USER_ACCESSIBILITY.isProgress,
         
        },
        { $unset: { stripeAccountId: "" } },
        { new: true }
      );

      return createNewStripeAccountAndLink(
        normalUser.email,
        userData.id
      );
    }

    return {
      card_payments: cardPayments,
      transfers,
    };
  }

  // ─── CASE 2: No Stripe account → create new ────────────────────────────────
  return createNewStripeAccountAndLink(normalUser.email, userData.id);
};


// ─── Service: Refresh Onboarding Link ────────────────────────────────────────

const updateOnboardingLinkIntoDb = async (
  userId: string
): Promise<{ link: string }> => {
  const normalUser = await users.findOne<UserDocument>(
    {
      _id: userId,
      isVerify: true,
      status: USER_ACCESSIBILITY.isProgress,
    },
    { _id: 1, stripeAccountId: 1 }
  );

  if (!normalUser) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "User not found or is restricted",
      ""
    );
  }

  if (!normalUser.stripeAccountId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "No Stripe account found for this user",
      ""
    );
  }

  const accountLink = await stripe.accountLinks.create({
    account: normalUser.stripeAccountId,
    refresh_url: `${config.stripe_payment_gateway.onboarding_refresh_url}?accountId=${normalUser.stripeAccountId}`,
    return_url: config.stripe_payment_gateway.onboarding_return_url,
    type: "account_onboarding",
  });

  return { link: accountLink.url };
};



const createPaymentIntent = async (
  userId: string,
  paymentDetails: Partial<PaymentDetails>
): Promise<{ clientSecret: string | null; paymentIntentId: string }> => {
  const { price, serviceId, description = "Truck service payment" } =
    paymentDetails;

  if (!price || price <= 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Price must be a positive number",
      ""
    );
  }

  if (!userId || !Types.ObjectId.isValid(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Valid user ID is required", "");
  }

  // FIX: was `Types.ObjectId.isValid(subscriptionId)` — inverted logic rejected valid IDs
  if (!serviceId || !Types.ObjectId.isValid(serviceId)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Valid serviceId is required",
      ""
    );
  }

  // FIX: fetch the user's connected Stripe account to use as the transfer destination
  const user = await users.findOne<UserDocument>(
    {
      _id: userId,
      isDelete: false,
      isVerify: true,
      status: USER_ACCESSIBILITY.isProgress,
    },
    { stripeAccountId: 1 }
  );

  if (!user?.stripeAccountId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "User does not have a connected Stripe account",
      ""
    );
  }

  const amountInCents = Math.round(price * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "usd",
    description,
    metadata: {
      serviceId,
      userId,
    },
    application_fee_amount: Math.round(amountInCents * 0.05),
    transfer_data: {
      destination: user.stripeAccountId, // FIX: was empty string ""
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
};

// ─── Service: Retrieve Payment Status ────────────────────────────────────────

const retrievePaymentStatus = async (
  paymentIntentId: string
): Promise<{
  id: string;
  status: string;
  amount: number;
  metadata: Record<string, string>;
  created: string;
}> => {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  return {
    id: paymentIntent.id,
    status: paymentIntent.status,
    amount: paymentIntent.amount / 100,
    metadata: paymentIntent.metadata,
    created: new Date(paymentIntent.created * 1000).toISOString(),
  };
};

// ─── Service: Create Checkout Session for Subscription ───────────────────────

const createCheckoutSessionForSubscription = async (
  userId: string,
  paymentDetails: PaymentDetails
): Promise<{ checkoutUrl: string; sessionId: string }> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { price, serviceId, description = "Subscription payment" } =
      paymentDetails;

    if (!price || price <= 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Price must be a positive number",
        ""
      );
    }

    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Valid user ID is required",
        ""
      );
    }

    const user = await users
      .findOne<UserDocument>(
        {
          _id: userId,
          isVerify: true,
          status: USER_ACCESSIBILITY.isProgress,
        },
        { stripeAccountId: 1, email: 1 }
      )
      .session(session);

    if (!user) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        "User not found or not verified",
        ""
      );
    }

    let existingServiceId: string | undefined = undefined;
    let metadata: Record<string, string> = {
      userId,
    };

    if (serviceId) {
      if (!Types.ObjectId.isValid(serviceId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid serviceId", "");
      }
      const existingServices = await services
        .exists({ _id: serviceId })
        .session(session);

      if (!existingServices) {
        throw new ApiError(httpStatus.NOT_FOUND, "Service not found", "");
      }
      existingServiceId = serviceId;
      metadata.serviceId = serviceId;
    } else if (paymentDetails.bookingData) {
      const { jobId, selectedDate, availablePackagesService, addOnsService } = paymentDetails.bookingData;
      if (!jobId || !Types.ObjectId.isValid(jobId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Valid jobId is required in bookingData", "");
      }
      if (!selectedDate) {
        throw new ApiError(httpStatus.BAD_REQUEST, "selectedDate is required in bookingData", "");
      }

      metadata.jobId = jobId;
      metadata.selectedDate = selectedDate;
      
      if (availablePackagesService && availablePackagesService.length > 0) {
        metadata.packages = availablePackagesService.map(p => p.availablePackageId).join(',');
      }
      if (addOnsService && addOnsService.length > 0) {
        metadata.addons = addOnsService.map(a => a.addOnsId).join(',');
      }
    } else {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Either serviceId or bookingData must be provided",
        ""
      );
    }

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "job services",
              description,
              metadata: { userId },
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      metadata,
      mode: "payment",
      success_url: `${config.stripe_payment_gateway.checkout_success_url}?sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: config.stripe_payment_gateway.checkout_cancel_url,
    });

    // Persist a pending payment record; final status is updated by the webhook
    const payment = new payments({
      currency: stripeSession.currency,
      sessionId: stripeSession.id,
      userId,
      serviceId: existingServiceId ? new Types.ObjectId(existingServiceId) : undefined,
      payment_method: stripeSession.payment_method_types[0],
      payment_status: stripeSession.payment_status,
      price,
      description,
    });

    const savedPayment = await payment.save({ session });
    

    if (!savedPayment) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to save payment record",
        ""
      );
    }

    // NOTE: currentsubscribers record is intentionally NOT created here.
    // It is created in handleWebhookIntoDb once Stripe confirms payment via
    // the `checkout.session.completed` event, preventing duplicate records.

    await session.commitTransaction();

    return {
      checkoutUrl: stripeSession.url as string,
      sessionId: stripeSession.id,
    };
  } catch (error: unknown) {
    await session.abortTransaction();

    if (error instanceof ApiError) throw error;

    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      `Checkout service unavailable: ${message}`,
      ""
    );
  } finally {
    session.endSession();
  }
};


const handleWebhookIntoDb = async (
  event: any
): Promise<{ status: boolean; message: string }> => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    let response = {
      status: false,
      message: "Unhandled event",
    };

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;

        if (!paymentIntent?.id) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Invalid payment intent",
            ""
          );
        }

        await payments.updateOne(
          {
            payment_intent: paymentIntent.id,
          },
          {
            $set: {
              payment_status: payment_status.paid,
            },
          },
          { session }
        );

        response = {
          status: true,
          message: "Payment marked as PAID",
        };

        break;
      }

      case "checkout.session.completed": {
        const sessionData = event.data.object;

        const userId = sessionData.metadata?.userId;
        const serviceId = sessionData.metadata?.serviceId;
        const jobId = sessionData.metadata?.jobId;

        if (!userId) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Missing userId in metadata",
            ""
          );
        }

        let finalServiceId = serviceId;

        if (!serviceId && jobId) {
          const selectedDate = sessionData.metadata?.selectedDate;
          const packagesStr = sessionData.metadata?.packages;
          const addonsStr = sessionData.metadata?.addons;

          const availablePackagesService = packagesStr 
            ? packagesStr.split(',').map((id: string) => ({ availablePackageId: id, isDelete: false })) 
            : [];
          const addOnsService = addonsStr 
            ? addonsStr.split(',').map((id: string) => ({ addOnsId: id, isDelete: false })) 
            : [];

          const newService = await JobsServices.createNewJobsServicesIntoDb(userId, {
            jobId,
            selectedDate: new Date(selectedDate),
            availablePackagesService,
            addOnsService,
            isAdvancePayment: true,
            isCompletePayment: false,
            isAccepted: false,
            isServiceStarted: false,
            isServiceEed: false,
            isDelete: false
          } as any);

          finalServiceId = newService._id.toString();
        } else if (serviceId) {
          const service = await services
            .findById(serviceId)
            .session(session);

          if (!service) {
            throw new ApiError(
              httpStatus.NOT_FOUND,
              "Service not found",
              ""
            );
          }

          if (!service.isAdvancePayment) {
            service.isAdvancePayment = true;
            service.isCompletePayment = false;
          } else if (!service.isCompletePayment) {
            service.isCompletePayment = true;
          }

          await service.save({ session });
        } else {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Missing serviceId or jobId in metadata",
            ""
          );
        }

        await payments.updateOne(
          {
            sessionId: sessionData.id,
          },
          {
            $set: {
              userId,
              serviceId: finalServiceId ? new Types.ObjectId(finalServiceId) : undefined,
              sessionId: sessionData.id,
              price: (sessionData.amount_total ?? 0) / 100,
              currency: sessionData.currency ?? "usd",
              paymentmethod: payment_method.card,
              payment_status: payment_status.paid,
              payable_name:
                sessionData.customer_details?.name ?? "",
              payable_email:
                sessionData.customer_details?.email ?? "",
              payment_intent:
                sessionData.payment_intent as string,
              country:
                sessionData.customer_details?.address?.country ?? "",
            },
          },
          {
            upsert: true,
            session,
          }
        );

        const notification = new notifications({
          userId,
          title: "Payment Successful",
          message:
            "Your payment has been completed successfully.",
          isRead: false,
          route: `/notification/${finalServiceId}`,
        });

        await notification.save({ session });

        try {
          const io = getSocketIO();

          if (io) {
            io.emit(`user::${USER_ROLE.admin}`, {
              id: Date.now(),
              title: "New Payment Received",
              message: `User ${userId} completed payment`,
              type: "payment",
              timestamp: new Date().toISOString(),
              sender: "system",
            });
          }
        } catch (error) {
          console.log(
            "Socket not initialized. Skipping realtime notification."
          );
        }

        response = {
          status: true,
          message: "Checkout processed successfully",
        };

        break;
      }

      case "account.updated": {
        response = {
          status: true,
          message: "Account updated",
        };
        break;
      }

      default: {
        console.warn(
          `Ignored Stripe event: ${event.type}`
        );
        break;
      }
    }

    await session.commitTransaction();

    // Flush cache so cleaner open jobs list refreshes immediately
    cache.flushAll();

    return response;
  } catch (error: any) {
    await session.abortTransaction();

    console.error("🔥 Stripe Webhook Error:", error);

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      error.message || "Webhook failed",
      ""
    );
  } finally {
    session.endSession();
  }
};

const findByAllPaymentIntoDb = async (
  query: Record<string, unknown>
) => {
  try {
    const cacheKey = `payments_${JSON.stringify(query)}`;

    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const allPaymentsQuery = new QueryBuilder(
      payments
        .find({ payment_status: payment_status.paid }).populate([
           {
            path: "userId",
            select: "name email location photo country phoneNumber",
          },
          {
            path: "serviceId",
            select: "jobId selectedDate  isAccepted isServiceStarted isServiceEed isAdvancePayment isCompletePayment totalAmount",
          },
        ])
        .lean(),
      query
    )
      .search(payment_search_filed)
      .filter()
      .sort()
      .paginate()
      .fields();

    const allPayments = await allPaymentsQuery.modelQuery;
    const meta = await allPaymentsQuery.countTotal();

    const result = {
      meta,
      data: allPayments,
    };

    cache.set(cacheKey, result);

    return result;
  } catch (error) {
    throw catchError(error);
  }
};




const confirmBookingPaymentIntoDb = async (sessionId: string) => {
  const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

  if (stripeSession.payment_status !== "paid") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Payment not completed yet on Stripe",
      ""
    );
  }

  const userId = stripeSession.metadata?.userId;
  const serviceId = stripeSession.metadata?.serviceId;
  const jobId = stripeSession.metadata?.jobId;

  if (!userId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Missing userId in Stripe session metadata",
      ""
    );
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    let finalServiceId = serviceId;

    if (!serviceId && jobId) {
      const existingService = await services.findOne({
        jobId,
        userId,
        isDelete: { $ne: true }
      }).session(session);

      if (existingService) {
        finalServiceId = existingService._id.toString();
      } else {
        const selectedDate = stripeSession.metadata?.selectedDate;
        const packagesStr = stripeSession.metadata?.packages;
        const addonsStr = stripeSession.metadata?.addons;

        const availablePackagesService = packagesStr 
          ? packagesStr.split(',').map((id: string) => ({ availablePackageId: id, isDelete: false })) 
          : [];
        const addOnsService = addonsStr 
          ? addonsStr.split(',').map((id: string) => ({ addOnsId: id, isDelete: false })) 
          : [];

        const newService = await JobsServices.createNewJobsServicesIntoDb(userId, {
          jobId,
          selectedDate: new Date(selectedDate!),
          availablePackagesService,
          addOnsService,
          isAdvancePayment: true,
          isCompletePayment: false,
          isAccepted: false,
          isServiceStarted: false,
          isServiceEed: false,
          isDelete: false
        } as any);

        finalServiceId = newService._id.toString();
      }
    } else if (serviceId) {
      const service = await services
        .findById(serviceId)
        .session(session);

      if (!service) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "Service not found",
          ""
        );
      }

      if (!service.isAdvancePayment) {
        service.isAdvancePayment = true;
        service.isCompletePayment = false;
      } else if (!service.isCompletePayment) {
        service.isCompletePayment = true;
      }

      await service.save({ session });
    }

    await payments.updateOne(
      {
        sessionId: stripeSession.id,
      },
      {
        $set: {
          userId,
          serviceId: finalServiceId ? new Types.ObjectId(finalServiceId) : undefined,
          sessionId: stripeSession.id,
          price: (stripeSession.amount_total ?? 0) / 100,
          currency: stripeSession.currency ?? "usd",
          paymentmethod: payment_method.card,
          payment_status: payment_status.paid,
          payable_name:
            stripeSession.customer_details?.name ?? "",
          payable_email:
            stripeSession.customer_details?.email ?? "",
          payment_intent:
            stripeSession.payment_intent as string,
          country:
            stripeSession.customer_details?.address?.country ?? "",
        },
      },
      {
        upsert: true,
        session,
      }
    );

    const existingNotification = await notifications.findOne({
      userId,
      route: `/notification/${finalServiceId}`
    }).session(session);

    if (!existingNotification) {
      const notification = new notifications({
        userId,
        title: "Payment Successful",
        message: "Your payment has been completed successfully.",
        isRead: false,
        route: `/notification/${finalServiceId}`,
      });
      await notification.save({ session });
    }

    await session.commitTransaction();

    // Flush cache so cleaner open jobs list refreshes immediately
    cache.flushAll();

    return {
      success: true,
      serviceId: finalServiceId,
      message: "Booking and payment confirmed successfully"
    };

  } catch (error: any) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const PaymentGatewayServices = {
  createConnectedAccountAndOnboardingLinkIntoDb,
  updateOnboardingLinkIntoDb,
  createPaymentIntent,
  retrievePaymentStatus,
  createCheckoutSessionForSubscription,
  handleWebhookIntoDb,
  findByAllPaymentIntoDb,
  confirmBookingPaymentIntoDb
};

export default PaymentGatewayServices;