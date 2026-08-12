import { Router } from "express";
import invitationController from "../controllers/invitationController";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/zodValidate";
import { 
  createInvitationSchema, 
  invitedSignupSchema,
  verifyInvitationSchema,
 } from "../schemas/invitationSchema";

const invitationRouter = Router();

invitationRouter.get(
  "/verify",
  validate(verifyInvitationSchema, "query"),
  invitationController.verifyInvitation,
);

invitationRouter.post(
  "/signup",
  validate(invitedSignupSchema),
  invitationController.invitedSignup,
);

invitationRouter.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN"),
  validate(createInvitationSchema),
  invitationController.createInvitation,
);

export default invitationRouter;