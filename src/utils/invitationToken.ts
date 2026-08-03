import { createHash, randomBytes } from "crypto";

const INVITATION_TOKEN_BYTES = 32;
const INVITATION_EXPIRES_IN_HOURS = 24;

export const createInvitationToken = () => {
  return randomBytes(INVITATION_TOKEN_BYTES).toString("hex");
};

export const hashInvitationToken = (token: string) => {
  return createHash("sha256").update(token).digest("hex");
};

export const getInvitationExpirationDate = () => {
  const expiresAt = new Date();

  expiresAt.setHours(
    expiresAt.getHours() + INVITATION_EXPIRES_IN_HOURS,
  );

  return expiresAt;
};