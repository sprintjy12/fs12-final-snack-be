import { UserRole } from "@prisma/client";
import { Router } from "express";

import userController from "../controllers/userController";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/zodValidate";
import {
  updateUserRoleSchema,
  userIdParamSchema,
  changePasswordSchema,
  changeCompanyNameSchema,
  getUsersQuerySchema,
} from "../schemas/userSchema";

const userRouter = Router();

userRouter.get(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  validate(getUsersQuerySchema, "query"),
  userController.getUsers,
);

userRouter.get(
  "/me",
  authenticate,
  userController.getMyProfile,
);

userRouter.patch(
  "/me/password",
  authenticate,
  validate(changePasswordSchema),
  userController.changePassword,
);

userRouter.patch(
  "/me/company",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  validate(changeCompanyNameSchema),
  userController.changeCompanyName,
);

userRouter.patch(
  "/:userId/role",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  validate(userIdParamSchema, "params"),
  validate(updateUserRoleSchema, "body"),
  userController.updateUserRole,
);

userRouter.patch(
  "/:userId/restore",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  validate(userIdParamSchema, "params"),
  userController.restoreUser,
);

userRouter.delete(
  "/:userId",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  validate(userIdParamSchema, "params"),
  userController.withdrawUser,
);

export default userRouter;
