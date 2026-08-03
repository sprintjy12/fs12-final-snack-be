import { Resend } from "resend";

import { ErrorCodes } from "../constants/errorCodes";
import AppError from "./appError";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL;
const frontendUrl = process.env.FRONTEND_URL;

if (!resendApiKey) {
  throw new Error("RESEND_API_KEY 환경변수가 필요합니다.");
}

if (!resendFromEmail) {
  throw new Error("RESEND_FROM_EMAIL 환경변수가 필요합니다.");
}

if (!frontendUrl) {
  throw new Error("FRONTEND_URL 환경변수가 필요합니다.");
}

const resend = new Resend(resendApiKey);

export const sendInvitationEmail = async (
  email: string,
  name: string,
  invitationToken: string,
) => {
  const invitationUrl = `${frontendUrl}/invite?token=${encodeURIComponent(
    invitationToken,
  )}`;

  const { error } = await resend.emails.send({
    from: resendFromEmail,
    to: email,
    subject: "간식대장 회원 초대",
    html: `
      <p>${name}님, 간식대장에 초대되었습니다.</p>
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
};