import { Request, Response } from "express";
import uploadService from "../services/uploadService.js";

async function createPresignedUrl(req: Request, res: Response) {
  const { fileName, contentType, fileSize } = req.body as {
    fileName: string;
    contentType: string;
    fileSize: number;
  };

  const result = await uploadService.createPresignedUrl({
    fileName,
    contentType,
    fileSize,
  });

  res.status(200).json(result);
}

export default {
  createPresignedUrl,
};
