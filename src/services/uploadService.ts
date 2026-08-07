import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { ErrorCodes } from "../constants/errorCodes.js";
import AppError from "../utils/appError.js";

function getRequiredAwsCredential(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  }

  return value;
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: getRequiredAwsCredential("AWS_ACCESS_KEY_ID"),
    secretAccessKey: getRequiredAwsCredential("AWS_SECRET_ACCESS_KEY"),
  },
});

const allowedContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

interface CreatePresignedUrlInput {
  fileName: string;
  contentType: string;
}

async function createPresignedUrl({
  fileName,
  contentType,
}: CreatePresignedUrlInput) {
  if (!allowedContentTypes.has(contentType)) {
    throw new AppError(ErrorCodes.UPLOAD.INVALID_CONTENT_TYPE);
  }

  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) {
    throw new AppError("S3_BUCKET_NAME 환경변수가 설정되지 않았습니다.", 500);
  }

  const key = `images/${randomUUID()}-${fileName}`;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 60 * 5,
  });

  return { uploadUrl, key };
}

export default {
  createPresignedUrl,
};
