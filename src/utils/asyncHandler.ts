import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * 비동기 컨트롤러 함수의 try-catch 구문을 래핑해주는 유틸리티 함수
 * @param fn 비동기 요청을 처리하는 컨트롤러 함수
 * @returns Express RequestHandler (미들웨어 형태로 리턴)
 */
const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 비동기 함수 실행 중 에러(Promise Rejection)가 발생하면 .catch(next)를 통해 
    // Express 전역 에러 핸들러로 자동 전달합니다.
    fn(req, res, next).catch(next);
  };
};

export default asyncHandler;