import { Router } from "express";
import uploadController from "../controllers/uploadController.js";
import { authenticate } from "../middlewares/authenticate";
import { validate } from "../middlewares/zodValidate.js";
import { createPresignedUrlSchema } from "../schemas/uploadSchema.js";
import asyncHandler from "../utils/asyncHandler.js";

const uploadRouter = Router();

uploadRouter.post(
  "/presigned-url",
  authenticate,
  validate(createPresignedUrlSchema),
  asyncHandler(uploadController.createPresignedUrl),
);

export default uploadRouter;
