import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import validationRequest from '../../middleware/validationRequest';
import ServiceValidation from './services.validation';
import JobsController from './services.controller';

const router=express.Router();

router.post("/create_service", 
    auth(USER_ROLE.customer),
     validationRequest(ServiceValidation.createServiceValidationSchema),
    JobsController.createNewJobsServices);

    router.get("/find_my_all_services", auth(USER_ROLE.customer), JobsController.findMyAllServices);
    router.delete("/delete_jobs_services/:id", auth(USER_ROLE.customer), JobsController.deleteJobsServices);

    router.get("/find_by_specific_service/:id", auth(USER_ROLE.customer, USER_ROLE.cleaner), JobsController.findBySpecificService);

    // Lifecycle endpoints
    router.post("/extend_deadline", auth(USER_ROLE.cleaner), JobsController.extendDeadline);
    router.patch("/accept_extension/:id", auth(USER_ROLE.customer), JobsController.acceptExtension);
    router.post("/request_completion", auth(USER_ROLE.cleaner), JobsController.requestCompletion);
    router.post("/accept_completion", auth(USER_ROLE.customer), JobsController.acceptCompletion);

const ServicesRouter = router;
export default ServicesRouter;