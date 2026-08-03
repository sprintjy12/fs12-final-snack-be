import { Router } from "express";

import userController from "../controllers/userController";
import { authenticate } from "../middlewares/authenticate";

const userRouter = Router();

userRouter.get(
  "/me",
  authenticate,
  userController.getMyProfile,
);

export default userRouter;