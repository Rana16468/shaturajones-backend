import { Request, RequestHandler, Response } from 'express';

import httpStatus from 'http-status';



import Stripe from 'stripe';
import config from '../../app/config';
import catchAsync from '../../utility/catchAsync';
import PaymentGatewayServices from './payment_gateway.services';
import sendResponse from '../../utility/sendRespone';
import ApiError from '../../app/error/ApiError';





const stripe = new Stripe(
  config.stripe_payment_gateway.stripe_secret_key as string,
);


const createConnectedAccountAndOnboardingLink:RequestHandler = catchAsync(
  async (req: Request, res: Response) => {

   
    const result =
      await PaymentGatewayServices.createConnectedAccountAndOnboardingLinkIntoDb(
        req.user,
      );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Onboarding link created successfully',
      data: { onboardingUrl: result },
    });
  },
);

const refreshOnboardingLink = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;

    const result =
      await PaymentGatewayServices.updateOnboardingLinkIntoDb(userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Onboarding link refreshed successfully',
      data: result,
    });
  },
);

const createPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { price, serviceId, description } = req.body;

  const result = await PaymentGatewayServices.createPaymentIntent(userId, {
    price,
    serviceId,
    description,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment intent created successfully',
    data: result,
  });
});

const getPaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const { paymentIntentId } = req.params;

  const result =
    await PaymentGatewayServices.retrievePaymentStatus(paymentIntentId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment status retrieved successfully',
    data: result,
  });
});

const createCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { price, serviceId, description } = req.body;

    const result =
      await PaymentGatewayServices.createCheckoutSessionForSubscription(
        userId,
        { price, serviceId, description },
      );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Checkout session created successfully',
      data: result,
    });
  },
);


const handleWebhook = async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;

  if (!signature) {
    return res.status(400).json({
      success: false,
      message: "Missing stripe signature",
    });
  }

  const rawBody = req.body;

  if (!rawBody) {
    return res.status(400).json({
      success: false,
      message: "Missing raw body",
    });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody, 
      signature,
      config.stripe_payment_gateway.stripe_webhook_secret as string
    );
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: `Webhook signature verification failed: ${err.message}`,
    });
  }

  try {
    const result = await PaymentGatewayServices.handleWebhookIntoDb(event);

    return res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
      data: result,
    });
  } catch (error: any) {
    // ⚠️ don’t crash Stripe retry system
    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
      error: error.message,
    });
  }
};




const PaymentGatewayController = {
  createConnectedAccountAndOnboardingLink,
  refreshOnboardingLink,
  createPaymentIntent,
  getPaymentStatus,
  createCheckoutSession,
  handleWebhook,
  
};

export default PaymentGatewayController;
