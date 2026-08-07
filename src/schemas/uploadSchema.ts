import { z } from "zod";

export const createPresignedUrlSchema = z.object({
  fileName: z.string().trim().min(1, "파일명을 입력해주세요."),
  contentType: z.string().trim().min(1, "콘텐츠 타입을 입력해주세요."),
});
