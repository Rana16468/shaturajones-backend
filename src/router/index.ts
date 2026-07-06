import express from 'express';
import { ContructRouter } from '../module/contract/contract.routes';
import UserRouters from '../module/user/user.routes';
import AuthRouter from '../module/auth/auth.routes';
import SettingsRoutes from '../module/settings/settings.routres';
import CreateJobsRouter from '../module/createJobs/createJobs.route';
import ServicesRouter from '../module/services/services.route';
import NotificationRoute from '../module/notification/notification.route';
import { PaymentGatewayRoutes } from '../module/payment_gateway/payment_gateway.route';
import cleanerDistributionRouter from '../module/cleanerDistribusation/cleanerDistribusation.route';
import WorkProgressRouter from '../module/workProgress/workProgress.route';
import { RatingReviewRoutes } from '../module/ratingReview/ratingReview.route';

const router = express.Router();
const moduleRouter = [
  { path: '/contract', route: ContructRouter },
  { path: '/user', route: UserRouters },
  {path:"/auth", route: AuthRouter},
  {path:"/setting", route: SettingsRoutes},
  {path:"/jobs", route: CreateJobsRouter},
  {path:"/services", route: ServicesRouter},
  {path:"/notifications", route: NotificationRoute},
  {path:"/payment_gateway", route: PaymentGatewayRoutes},
  {path:"/distribution_jobs", route: cleanerDistributionRouter},
  {path:"/work_progress", route: WorkProgressRouter},
  {path:"/rating_review", route: RatingReviewRoutes},
];

moduleRouter.forEach((v) => router.use(v.path, v.route));

export default router;
