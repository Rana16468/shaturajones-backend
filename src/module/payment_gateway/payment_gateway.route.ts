import express from 'express';




import bodyParser from 'body-parser';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import PaymentGatewayController from './payment_gateway.controller';
import validationRequest from '../../middleware/validationRequest';
import PaymentValidation from './payment_gateway.validation';


const router = express.Router();

// Routes for Stripe account onboarding
router.get(
  '/create-onboarding-link',
  auth(USER_ROLE.customer),
  PaymentGatewayController.createConnectedAccountAndOnboardingLink,
);

router.post(
  '/refresh-onboarding-link',
   auth(USER_ROLE.customer),
  validationRequest(PaymentValidation.refreshOnboardingLink),
  PaymentGatewayController.refreshOnboardingLink,
);

// Routes for payment processing
router.post(
  '/create-payment-intent',
   auth(USER_ROLE.customer),
  validationRequest(PaymentValidation.createPaymentIntent),
  PaymentGatewayController.createPaymentIntent,
);

router.get(
  '/payment-status/:paymentIntentId',
   auth(USER_ROLE.customer),
  PaymentGatewayController.getPaymentStatus,
);

// Checkout session routes
router.post(
  '/create-checkout-session',
   auth(USER_ROLE.customer),
  validationRequest(PaymentValidation.createCheckoutSession),
  PaymentGatewayController.createCheckoutSession,
);

// Webhook route for Stripe events
router.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  PaymentGatewayController.handleWebhook,
);


export const PaymentGatewayRoutes = router;
