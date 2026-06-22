import express from 'express';
import { ContructRouter } from '../module/contract/contract.routes';
import UserRouters from '../module/user/user.routes';
import AuthRouter from '../module/auth/auth.routes';
import SettingsRoutes from '../module/settings/settings.routres';
import CreateJobsRouter from '../module/createJobs/createJobs.route';

const router = express.Router();
const moduleRouter = [
  { path: '/contract', route: ContructRouter },
  { path: '/user', route: UserRouters },
  {path:"/auth", route: AuthRouter},
  {path:"/setting", route: SettingsRoutes},
  {path:"/jobs", route: CreateJobsRouter}
];

moduleRouter.forEach((v) => router.use(v.path, v.route));

export default router;
