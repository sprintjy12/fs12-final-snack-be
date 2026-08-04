import { createHash, randomBytes } from "crypto";

const INVITATION_TOKEN_BYTES = 32;
const INVITATION_EXPIRES_IN_HOURS = 24;
const HOUR_IN_MS = 60 * 60 * 1000;

export const createInvitationToken = () => {
  return randomBytes(INVITATION_TOKEN_BYTES).toString("hex");
};

export const hashInvitationToken = (token: string) => {
  return createHash("sha256").update(token).digest("hex");
};

export const getInvitationExpirationDate = () => {
  return new Date(
    Date.now() + INVITATION_EXPIRES_IN_HOURS * HOUR_IN_MS,
  );
};