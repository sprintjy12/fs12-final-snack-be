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
    .trim()
    .min(1, {
      error: "초대 토큰이 필요합니다.",
    }),
});

export type VerifyInvitationInput = z.infer<
  typeof verifyInvitationSchema
>;

export const invitedSignupSchema = z.object({
  token: z
    .string()
    .min(1, {
      error: "초대 토큰이 필요합니다.",
    }),

  password: z
    .string()
    .min(8, {
      error: "비밀번호는 최소 8자 이상이어야 합니다.",
    })
    .max(20, {
      error: "비밀번호는 최대 20자까지 입력할 수 있습니다.",
    })
    .regex(/[A-Za-z]/, {
      error: "비밀번호에는 영문이 포함되어야 합니다.",
    })
    .regex(/[0-9]/, {
      error: "비밀번호에는 숫자가 포함되어야 합니다.",
    })
    .regex(/[^A-Za-z0-9]/, {
      error: "비밀번호에는 특수문자가 포함되어야 합니다.",
    })
    .regex(/^[\x21-\x7E]+$/, {
      error: "비밀번호에는 한글, 공백, 이모지를 사용할 수 없습니다.",
    }),
});

export type InvitedSignupInput = z.infer<
  typeof invitedSignupSchema
>;