/**
 * 커스텀 에러 처리용 클래스
 * @extends Error
 */
class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;
  public errorCode?: string;

  // 오버로딩: 1) 에러 코드 객체만 받는 경우 / 2) 기존처럼 직접 다 받는 경우
  constructor(errorDetail: { code: string; statusCode: number; message: string }, customMessage?: string);
  constructor(message: string, statusCode: number, errorCode?: string);
  constructor(
    arg1: string | { code: string; statusCode: number; message: string },
    arg2?: number | string,
    arg3?: string
  ) {
    let message: string;
    let statusCode: number;
    let errorCode: string | undefined;

    if (typeof arg1 === 'object') {
      // 에러 코드 객체를 통째로 넣었을 때
      const customMessage = typeof arg2 === 'string' ? arg2 : undefined;
      message = customMessage || arg1.message;
      statusCode = arg1.statusCode;
      errorCode = arg1.code;
    } else {
      // 기존 방식대로 직접 입력했을 때
      message = arg1;
      statusCode = typeof arg2 === 'number' ? arg2 : 500;
      errorCode = arg3;
    }

    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
