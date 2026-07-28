import { ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";

export const validate =
  (schema: ZodSchema, source: "body" | "query" | "params" = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return res.status(400).json({
        message: "요청 값이 올바르지 않습니다.",
        errors: result.error.flatten().fieldErrors,
      });
    }

    (req as any)[source] = result.data;
    next();
  };
