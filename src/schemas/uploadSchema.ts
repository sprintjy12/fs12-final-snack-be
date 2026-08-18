import { z } from "zod";

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export const createPresignedUrlSchema = z.object({
  fileName: z.string().trim().min(1, "파일명을 입력해주세요."),
  contentType: z
    .string()
    .trim()
    .pipe(
      z.enum(["image/jpeg", "image/png", "image/webp"], {
        error: "지원하지 않는 이미지 형식입니다.",
      }),
    ),
  fileSize: z.coerce
    .number()
    .int("파일 크기는 정수여야 합니다.")
    .positive("파일 크기는 0보다 커야 합니다.")
    .max(
      MAX_IMAGE_SIZE_BYTES,
      "이미지 크기는 최대 5MB까지 업로드할 수 있습니다.",
    ),
});
