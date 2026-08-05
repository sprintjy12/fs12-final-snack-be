import { z } from "zod";

export const userIdParamSchema = z.object({
  userId: z.string().uuid("유저 ID 형식이 올바르지 않습니다."),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN"], {
    error: "권한은 USER 또는 ADMIN만 가능합니다.",
  }),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

const passwordSchema = z
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
  });

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, {
      error: "현재 비밀번호를 입력해주세요.",
    }),
    newPassword: passwordSchema,
  }
);

export type ChangePasswordInput = z.infer<
  typeof changePasswordSchema
>;