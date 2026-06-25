import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import cleanerDistributionController from './cleanerDistribusation.controller';
const router=express.Router();
router.get("/find_by_all_jobs", auth(USER_ROLE.cleaner),cleanerDistributionController.findByAllServices );
const cleanerDistributionRouter= router;
export default cleanerDistributionRouter;