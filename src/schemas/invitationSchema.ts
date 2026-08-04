import { InvitationRole } from "@prisma/client";
import { z } from "zod";

export const createInvitationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "이름을 입력해주세요." })
    .max(8, { error: "이름은 최대 8자까지 입력할 수 있습니다." }),

  email: z
    .string()
    .trim()
    .max(254, { error: "이메일은 최대 254자까지 입력할 수 있습니다." })
    .pipe(z.email({ error: "올바른 이메일 형식이 아닙니다." }))
    .transform((email) => email.toLowerCase()),

  role: z.enum([InvitationRole.USER, InvitationRole.ADMIN], {
    error: "초대 권한은 USER 또는 ADMIN만 가능합니다.",
  }),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const verifyInvitationSchema = z.object({
  token: z
    .string()
    .min(1, {
      error: "초대 토큰이 필요합니다.",
    }),
});

export type VerifyInvitationInput = z.infer<
  typeof verifyInvitationSchema
>;