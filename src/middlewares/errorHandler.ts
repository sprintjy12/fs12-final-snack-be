import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 기본 상태 코드와 상태값 설정
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
    return res.status(409).json({
      success: false,
      code: 'PRODUCT_REFERENCED',
      message: '다른 곳에서 참조 중인 상품은 삭제할 수 없습니다.',
    });
  }

  // 1. 의도한 Operational Error인 경우 (AppError로 던진 것들)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.errorCode || 'INTERNAL_SERVER_ERROR',
      message: err.message,                            
    });
  }

  // 2. 예측하지 못한 시스템/서드파티 에러인 경우 (DB 에러, 500 에러 등)
  console.error('ERROR:', err);

  return res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: '서버 내부 에러가 발생했습니다. 잠시 후 다시 시도해주세요.',
  });
};

export default errorHandler;