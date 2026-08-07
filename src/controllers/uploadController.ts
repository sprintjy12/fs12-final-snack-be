import { Request, Response } from "express";
import uploadService from "../services/uploadService.js";

async function createPresignedUrl(req: Request, res: Response) {
  const { fileName, contentType } = req.body as {
    fileName: string;
    contentType: string;
  };

  const result = await uploadService.createPresignedUrl({
    fileName,
    contentType,
  });

  res.status(200).json(result);
}

export default {
  createPresignedUrl,
};
