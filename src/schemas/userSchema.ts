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
