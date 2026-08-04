import { Router } from "express";
import invitationController from "../controllers/invitationController";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/zodValidate";
import { createInvitationSchema } from "../schemas/invitationSchema";

const invitationRouter = Router();

invitationRouter.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN"),
  validate(createInvitationSchema),
  invitationController.createInvitation,
);

export default invitationRouter;