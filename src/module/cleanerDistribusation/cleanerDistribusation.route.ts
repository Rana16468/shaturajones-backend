import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import cleanerDistributionController from './cleanerDistribusation.controller';
import validationRequest from '../../middleware/validationRequest';
import cleanerDistributionsValidation from './cleanerDistribusation.validations';
const router=express.Router();
router.get("/find_by_all_jobs", 
      auth(USER_ROLE.cleaner),
      cleanerDistributionController.findByAllServices );

router.post("/accepted_job_offer", 
      auth(USER_ROLE.cleaner),
 validationRequest(cleanerDistributionsValidation.cleanerDistributionsSchema),
cleanerDistributionController.isAcceptedJobOffer);


router.delete("/rejected_job/:id",
       auth(USER_ROLE.cleaner),
        cleanerDistributionController.deleteJobOffer);

router.get("/find_my_accepted_jobs", 
      auth(USER_ROLE.cleaner, USER_ROLE.customer), 
      cleanerDistributionController.findMyAcceptedJobList);

router.get("/find_my_job_completed_graph",
      auth(USER_ROLE.cleaner),
      cleanerDistributionController.cleanerCompletedJobGraph
);
router.get("/find_my_recent_earning", 
      auth(USER_ROLE.cleaner),
      cleanerDistributionController.findMyAllRecentEarning
);

router.get("/find_my_earning_summary", 
      auth(USER_ROLE.cleaner),
       cleanerDistributionController.findMyEarningSummary)



const cleanerDistributionRouter= router;
export default cleanerDistributionRouter;