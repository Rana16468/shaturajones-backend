import express from "express";
import ReviewRatingController from "./ratingReview.controller";

import RatingReviewValidation from "./ratingReview.validation";
import validationRequest from "../../middleware/validationRequest";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constant";

const router = express.Router();

router.post("/review_rating", auth(USER_ROLE.customer),
 validationRequest(RatingReviewValidation.createRatingReviewValidationSchema),
  ReviewRatingController.createReviewRating);

export const RatingReviewRoutes = router;