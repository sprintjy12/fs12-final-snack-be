import { Resend } from "resend";

import { ErrorCodes } from "../constants/errorCodes";
import AppError from "./appError";

let resendClient: Resend | null = null;

const getResendConfig = () => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL;
  const frontendUrl = process.env.FRONTEND_URL;

  if (!resendApiKey || !resendFromEmail || !frontendUrl) {
    throw new AppError(ErrorCodes.INVITATION.EMAIL_SEND_FAILED);
  }

  return {
    resendApiKey,
    resendFromEmail,
    frontendUrl,
  };
};

const getResendClient = () => {
  if (!resendClient) {
    const { resendApiKey } = getResendConfig();
    resendClient = new Resend(resendApiKey);
  }

  return resendClient;
};

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

export const sendInvitationEmail = async (
  email: string,
  name: string,
  invitationToken: string,
) => {
  const { resendFromEmail, frontendUrl } = getResendConfig();
  const resend = getResendClient();

  const invitationUrl = `${frontendUrl}/invite?token=${encodeURIComponent(
    invitationToken,
  )}`;
  const safeName = escapeHtml(name);

  try {
    const { error } = await resend.emails.send({
      from: resendFromEmail,
      to: email,
      subject: "간식대장 회원 초대",
      html: `
      <p>${safeName}님, 간식대장에 초대되었습니다.</p>
      <p>아래 링크를 통해 회원가입을 진행해주세요.</p>
      <p>
        <a href="${invitationUrl}">
          회원가입하기
        </a>
      </p>
      <p>이 초대 링크는 24시간 동안 유효합니다.</p>
    `,
    });

    if (error) {
      throw new AppError(
        ErrorCodes.INVITATION.EMAIL_SEND_FAILED,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    // 네트워크/SDK 예외도 메일 실패로 통일 (502)
    throw new AppError(
      ErrorCodes.INVITATION.EMAIL_SEND_FAILED,
    );
  }
};
