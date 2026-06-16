import express from "express";

import settingValidationSchema from "./settings.validation";
import SettingController from "./settings.controller";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constant";
import validationRequest from "../../middleware/validationRequest";


const routes = express.Router();

routes.post(
  "/about",
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validationRequest(settingValidationSchema.AboutValidationSchema),
  SettingController.updateAboutUs,
);

routes.get("/find_by_about_us", SettingController.findByAboutUs);

routes.post(
  "/privacy_policys",
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validationRequest(settingValidationSchema.PrivacyPolicysValidationSchema),
  SettingController.privacyPolicys,
);
routes.get("/find_by_privacy_policys", SettingController.findByPrivacyPolicyss);

routes.post(
  "/terms_conditions",
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validationRequest(settingValidationSchema.TermsConditionsValidationSchema),
  SettingController.termsConditions,
);
routes.get(
  "/find_by_terms_conditions",
  SettingController.findByTermsConditions,
);

const SettingsRoutes = routes;

export default SettingsRoutes;
