import { z } from "zod";

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 20;

const ALLOWED_PASSWORD_CHARACTERS =
  /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/;

const PASSWORD_SPECIAL_CHARACTER =
  /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

export const superAdminSignupSchema = z.object({
  name: z
    .string({
      error: "이름을 입력해주세요.",
    })
    .trim()
    .min(1, "이름을 입력해주세요.")
    .max(8, "이름은 8자 이하로 입력해주세요."),

  email: z
    .string({
      error: "이메일을 입력해주세요.",
    })
    .trim()
    .min(1, "이메일을 입력해주세요.")
    .max(254, "이메일은 254자 이하로 입력해주세요.")
    .toLowerCase()
    .pipe(
      z.email({
        error: "올바른 이메일 형식이 아닙니다.",
      }),
    ),

  password: z
    .string({
      error: "비밀번호를 입력해주세요.",
    })
    .min(
      PASSWORD_MIN_LENGTH,
      `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`,
    )
    .max(
      PASSWORD_MAX_LENGTH,
      `비밀번호는 ${PASSWORD_MAX_LENGTH}자 이하여야 합니다.`,
    )
    .regex(
      ALLOWED_PASSWORD_CHARACTERS,
      "비밀번호는 영문, 숫자, 특수문자만 사용할 수 있습니다.",
    )
    .regex(/[A-Za-z]/, "비밀번호에 영문을 1자 이상 포함해주세요.")
    .regex(/[0-9]/, "비밀번호에 숫자를 1자 이상 포함해주세요.")
    .regex(
      PASSWORD_SPECIAL_CHARACTER,
      "비밀번호에 특수문자를 1자 이상 포함해주세요.",
    ),

  companyName: z
    .string({
      error: "회사명을 입력해주세요.",
    })
    .trim()
    .min(1, "회사명을 입력해주세요.")
    .max(15, "회사명은 15자 이하로 입력해주세요."),

  businessNumber: z
    .string({
      error: "사업자등록번호를 입력해주세요.",
    })
    .trim()
    .regex(
      /^\d{10}$/,
      "사업자등록번호는 하이픈 없이 숫자 10자리로 입력해주세요.",
    ),
});

export type SuperAdminSignupInput = z.infer<
  typeof superAdminSignupSchema
>;

export const loginSchema = z.object({
  email: z
    .string({
      error: "이메일을 입력해주세요.",
    })
    .trim()
    .min(1, "이메일을 입력해주세요.")
    .toLowerCase()
    .pipe(
      z.email({
        error: "올바른 이메일 형식이 아닙니다.",
      }),
    ),

  password: z
    .string({
      error: "비밀번호를 입력해주세요.",
    })
    .min(1, "비밀번호를 입력해주세요."),
});

export type LoginInput = z.infer<typeof loginSchema>;