import { Router } from "express";

import authController from "../controllers/authController.js";
import { validate } from "../middlewares/zodValidate.js";
import { superAdminSignupSchema } from "../schemas/authSchema.js";

const authRouter = Router();

authRouter.post(
  "/super-admin/signup",
  validate(superAdminSignupSchema),
  authController.signupSuperAdmin,
);

export default authRouter;