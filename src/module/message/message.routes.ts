import express, { NextFunction, Request, Response } from 'express';

import httpStatus from 'http-status';

import { USER_ROLE } from '../user/user.constant';


import MessageController from './message.controller';
import auth from '../../middleware/auth';
import upload from '../../utility/uplodeFile';
import ApiError from '../../app/error/ApiError';
import validationRequest from '../../middleware/validationRequest';
import MessageValidationSchema from './message.validations';


const router = express.Router();

router.post(
  '/new_message',
  auth(USER_ROLE.cleaner, USER_ROLE.customer,USER_ROLE.admin,USER_ROLE.superAdmin),
  upload.fields([
    { name: 'imageUrl', maxCount: 10 },
    { name: 'audioUrl', maxCount: 1 },
  ]),
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.body.data && typeof req.body.data === 'string') {
        req.body = JSON.parse(req.body.data);
      }

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      if (files?.imageUrl) {

        req.body.imageUrl = files.imageUrl.map((file) =>
          file.path.replace(/\\/g, '/'),
        );
      }

      if (files?.audioUrl && files.audioUrl.length > 0) {
        const audioPaths = files.audioUrl.map((file) =>
          file.path.replace(/\\/g, '/'),
        );

        req.body.audioUrl =
        audioPaths.length === 1 ? audioPaths[0] : audioPaths;
        console.log(req.body.audioUrl);
      }

      next();
    } catch (error: any) {
      next(new ApiError(httpStatus.BAD_REQUEST, 'Invalid JSON data', error));
    }
  },
  validationRequest(MessageValidationSchema.messageSchema),
  MessageController.new_message,
);

router.patch(
  '/update_message_by_Id/:messageId',
  auth(USER_ROLE.cleaner, USER_ROLE.customer,USER_ROLE.admin,USER_ROLE.superAdmin),
  upload.fields([{ name: 'imageUrl', maxCount: 5 }]),
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.body.data && typeof req.body.data === 'string') {
        req.body = JSON.parse(req.body.data);
      }

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      if (files?.imageUrl) {
        req.body.imageUrl = files.imageUrl.map((file) =>
          file.path.replace(/\\/g, '/'),
        );
      }

      next();
    } catch (error: any) {
      next(new ApiError(httpStatus.BAD_REQUEST, 'Invalid JSON data', error));
    }
  },
  validationRequest(MessageValidationSchema.messageUpdateSchema),
  MessageController.updateMessageById,
);

router.delete(
  '/delete_message/:messageId',
  auth(USER_ROLE.cleaner, USER_ROLE.customer,USER_ROLE.admin,USER_ROLE.superAdmin),
  MessageController.deleteMessageById,
);

router.get("/find_by_specific_conversation/:conversationId", 
  auth(USER_ROLE.cleaner, USER_ROLE.customer,USER_ROLE.admin,USER_ROLE.superAdmin),
   MessageController.findBySpecificConversation);
// single_new_message
router.post(
  '/single_new_message',
  auth(USER_ROLE.cleaner, USER_ROLE.customer,USER_ROLE.admin,USER_ROLE.superAdmin),
  upload.fields([
    { name: 'imageUrl', maxCount: 10 },
    { name: 'audioUrl', maxCount: 1 },
  ]),
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.body.data && typeof req.body.data === 'string') {
        req.body = JSON.parse(req.body.data);
      }

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      if (files?.imageUrl) {

        req.body.imageUrl = files.imageUrl.map((file) =>
          file.path.replace(/\\/g, '/'),
        );
      }

      if (files?.audioUrl && files.audioUrl.length > 0) {
        const audioPaths = files.audioUrl.map((file) =>
          file.path.replace(/\\/g, '/'),
        );

        req.body.audioUrl =
        audioPaths.length === 1 ? audioPaths[0] : audioPaths;
        // console.log(req.body.audioUrl);
      }

      next();
    } catch (error: any) {
      next(new ApiError(httpStatus.BAD_REQUEST, 'Invalid JSON data', error));
    }
  },
  MessageController.single_new_message,
);

const messageRoutes = router;

export default messageRoutes;