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

    

const ServicesRouter=router;
export default ServicesRouter;