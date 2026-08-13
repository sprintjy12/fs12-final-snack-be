export const ErrorCodes = {
  AUTH: {
    UNAUTHORIZED: {
      code: "AUTH_UNAUTHORIZED",
      statusCode: 401,
      message: "인증되지 않은 사용자입니다.",
    },
    ACCESS_TOKEN_REQUIRED: {
      code: "AUTH_ACCESS_TOKEN_REQUIRED",
      statusCode: 401,
      message: "액세스 토큰이 필요합니다.",
    },
    INVALID_ACCESS_TOKEN: {
      code: "AUTH_INVALID_ACCESS_TOKEN",
      statusCode: 401,
      message: "유효하지 않은 액세스 토큰입니다.",
    },
    ACCESS_TOKEN_EXPIRED: {
      code: "AUTH_ACCESS_TOKEN_EXPIRED",
      statusCode: 401,
      message: "액세스 토큰이 만료되었습니다.",
    },
    REFRESH_TOKEN_REQUIRED: {
      code: "AUTH_REFRESH_TOKEN_REQUIRED",
      statusCode: 401,
      message: "리프레시 토큰이 필요합니다.",
    },
    INVALID_REFRESH_TOKEN: {
      code: "AUTH_INVALID_REFRESH_TOKEN",
      statusCode: 401,
      message: "유효하지 않은 리프레시 토큰입니다.",
    },
    REFRESH_TOKEN_EXPIRED: {
      code: "AUTH_REFRESH_TOKEN_EXPIRED",
      statusCode: 401,
      message: "리프레시 토큰이 만료되었습니다.",
    },
    FORBIDDEN: {
      code: "AUTH_FORBIDDEN",
      statusCode: 403,
      message: "해당 요청을 수행할 권한이 없습니다.",
    },
    INACTIVE_USER: {
      code: "AUTH_INACTIVE_USER",
      statusCode: 401,
      message: "이용할 수 없는 계정입니다.",
    },  
    INVALID_CREDENTIALS: {
      code: "AUTH_INVALID_CREDENTIALS",
      statusCode: 401,
      message: "이메일 또는 비밀번호가 일치하지 않습니다.",
    },
    DUPLICATE_EMAIL: {
      code: "AUTH_DUPLICATE_EMAIL",
      statusCode: 409,
      message: "이미 사용 중인 이메일입니다.",
    },
    DUPLICATE_NICKNAME: {
      code: "AUTH_DUPLICATE_NICKNAME",
      statusCode: 409,
      message: "이미 사용 중인 닉네임입니다.",
    },
  },
  COMPANY: {
    NOT_FOUND: {
      code: "COMPANY_NOT_FOUND",
      statusCode: 404,
      message: "회사를 찾을 수 없습니다.",
    },
    DUPLICATE_BUSINESS_NUMBER: {
      code: "COMPANY_DUPLICATE_BUSINESS_NUMBER",
      statusCode: 409,
      message: "이미 등록된 사업자등록번호입니다.",
    },
  },
  USER: {
    NOT_FOUND: {
      code: "USER_NOT_FOUND",
      statusCode: 404,
      message: "존재하지 않는 유저입니다.",
    },
    ALREADY_WITHDRAWN: {
      code: "USER_ALREADY_WITHDRAWN",
      statusCode: 400,
      message: "이미 탈퇴한 회원입니다.",
    },
    UNAUTHORIZED_ACCESS: {
      code: "USER_UNAUTHORIZED_ACCESS",
      statusCode: 403,
      message: "같은 회사의 회원만 처리할 수 있습니다.",
    },
    CANNOT_CHANGE_SUPER_ADMIN: {
      code: "USER_CANNOT_CHANGE_SUPER_ADMIN",
      statusCode: 403,
      message: "최고 관리자의 권한은 변경할 수 없습니다.",
    },
    CANNOT_WITHDRAW_SUPER_ADMIN: {
      code: "USER_CANNOT_WITHDRAW_SUPER_ADMIN",
      statusCode: 403,
      message: "최고 관리자는 탈퇴 처리할 수 없습니다.",
    },
    CURRENT_PASSWORD_MISMATCH: {
      code: "CURRENT_PASSWORD_MISMATCH",
      statusCode: 400,
      message: "현재 비밀번호가 일치하지 않습니다.",
    },
    SAME_AS_CURRENT_PASSWORD: {
      code: "SAME_AS_CURRENT_PASSWORD",
      statusCode: 400,
      message: "새 비밀번호는 현재 비밀번호와 달라야 합니다.",
    },
    PASSWORD_CHANGE_CONFLICT: {
      code: "PASSWORD_CHANGE_CONFLICT",
      statusCode: 409,
      message: "비밀번호가 이미 변경되었습니다. 다시 로그인해주세요.",
    },
  },
  INVITATION: {
    NOT_FOUND: {
      code: "INVITATION_NOT_FOUND",
      statusCode: 404,
      message: "초대 정보를 찾을 수 없습니다.",
    },
    EXPIRED: {
      code: "INVITATION_EXPIRED",
      statusCode: 400,
      message: "만료된 초대입니다.",
    },
    ALREADY_USED: {
      code: "INVITATION_ALREADY_USED",
      statusCode: 400,
      message: "이미 사용된 초대입니다.",
    },
    ALREADY_EXISTS: {
      code: "INVITATION_ALREADY_EXISTS",
      statusCode: 409,
      message: "이미 유효한 초대가 존재합니다.",
    },
    USER_ALREADY_EXISTS: {
      code: "INVITATION_USER_ALREADY_EXISTS",
      statusCode: 409,
      message: "이미 가입된 이메일입니다.",
    },
    EMAIL_SEND_FAILED: {
      code: "INVITATION_EMAIL_SEND_FAILED",
      statusCode: 502,
      message: "초대 이메일 발송에 실패했습니다.",
    },
  },
  CATEGORY: {
    NOT_FOUND: {
      code: "CATEGORY_NOT_FOUND",
      statusCode: 404,
      message: "카테고리를 찾을 수 없습니다.",
    },
  },
  PRODUCT: {
    NOT_FOUND: {
      code: "PRODUCT_NOT_FOUND",
      statusCode: 404,
      message: "상품을 찾을 수 없습니다.",
    },
    UNAUTHORIZED_ACCESS: {
      code: "PRODUCT_UNAUTHORIZED_ACCESS",
      statusCode: 403,
      message: "본인이 등록한 상품만 수정/삭제할 수 있습니다.",
    },
    HAS_ORDER_HISTORY: {
      code: "PRODUCT_HAS_ORDER_HISTORY",
      statusCode: 409,
      message: "주문 내역이 있는 상품은 삭제할 수 없습니다.",
    },
    MISSING_REQUIRED_FIELDS: {
      code: "PRODUCT_MISSING_REQUIRED_FIELDS",
      statusCode: 400,
      message: "필수 항목이 누락되었습니다.",
    },
    INVALID_NAME: {
      code: "PRODUCT_INVALID_NAME",
      statusCode: 400,
      message: "상품명이 올바르지 않습니다.",
    },
    INVALID_PRICE: {
      code: "PRODUCT_INVALID_PRICE",
      statusCode: 400,
      message: "가격은 0보다 큰 정수여야 합니다.",
    },
    INVALID_IMAGE_URL: {
      code: "PRODUCT_INVALID_IMAGE_URL",
      statusCode: 400,
      message: "상품 이미지가 필요합니다.",
    },
  },
  ORDER: {
    NOT_FOUND: {
      code: "ORDER_NOT_FOUND",
      statusCode: 404,
      message: "주문 내역을 찾을 수 없습니다.",
    },
    INVALID_ORDER_TYPE: {
      code: "ORDER_INVALID_ORDER_TYPE",
      statusCode: 400,
      message: "잘못된 주문 유형입니다.",
    },
    INVALID_ORDER_STATUS: {
      code: "ORDER_INVALID_ORDER_STATUS",
      statusCode: 409,
      message: "변경할 수 없는 주문 상태입니다.",
    },
    UNAUTHORIZED_ACCESS: {
      code: "ORDER_UNAUTHORIZED_ACCESS",
      statusCode: 403,
      message: "주문에 대한 권한이 없습니다.",
    },
    EMPTY_ITEMS: {
      code: "ORDER_EMPTY_ITEMS",
      statusCode: 400,
      message: "구매할 상품을 선택해주세요.",
    },
  },
  CART: {
    ITEM_NOT_FOUND: {
      code: "CART_ITEM_NOT_FOUND",
      statusCode: 404,
      message: "장바구니에서 상품을 찾을 수 없습니다.",
    },
  },
  UPLOAD: {
    INVALID_CONTENT_TYPE: {
      code: "UPLOAD_INVALID_CONTENT_TYPE",
      statusCode: 400,
      message: "지원하지 않는 이미지 형식입니다.",
    },
    INVALID_FILE_SIZE: {
      code: "UPLOAD_INVALID_FILE_SIZE",
      statusCode: 400,
      message: "이미지 크기는 최대 10MB까지 업로드할 수 있습니다.",
    },
  },
  BUDGET: {
    NOT_FOUND: {
      code: "BUDGET_NOT_FOUND",
      statusCode: 404,
      message: "예산 정보를 찾을 수 없습니다.",
    },
    INSUFFICIENT_MONTHLY_BUDGET: {
      code: "BUDGET_INSUFFICIENT_MONTHLY_BUDGET",
      statusCode: 400,
      message: "월별 예산이 부족합니다.",
    },
    ALREADY_EXISTS: {
      code: "BUDGET_ALREADY_EXISTS",
      statusCode: 409,
      message: "이미 존재하는 예산입니다.",
    },
  },
} as const;

// 타입으로 활용할 수 있도록 추출
export type ErrorCodeType = typeof ErrorCodes;
