import { ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";

export const validate =
  (schema: ZodSchema, source: "body" | "query" | "params" = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      // 특정 필드가 아닌 요청 전체에 대한 검증 메시지는 formErrors로 모인다
      const { fieldErrors, formErrors } = result.error.flatten();

      return res.status(400).json({
        message: formErrors[0] ?? "요청 값이 올바르지 않습니다.",
        errors: fieldErrors,
      });
    }

    (req as any)[source] = result.data;
    next();
  };
