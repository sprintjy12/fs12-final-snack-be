import { Request, Response } from "express";

import {
  createMemberInvitation,
  signupInvitedUser,
  verifyInvitation,
} from "../services/invitationService";
import asyncHandler from "../utils/asyncHandler";

const handleCreateInvitation = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;

    const invitation = await createMemberInvitation(
      companyId,
      req.body,
    );

    res.status(201).json({
      message: "회원 초대에 성공했습니다.",
      data: invitation,
    });
  },
);

const handleVerifyInvitation = asyncHandler(
  async (req: Request, res: Response) => {
    const { token } = req.query as { token: string };

    const invitation = await verifyInvitation(token);

    res.set("Cache-Control", "no-store");

    res.status(200).json({
      message: "유효한 초대입니다.",
      data: invitation,
    });
  },
);

const handleInvitedSignup = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await signupInvitedUser(req.body);

    res.status(201).json({
      message: "회원가입에 성공했습니다.",
      data: user,
    });
  },
);

export default {
  createInvitation: handleCreateInvitation,
  verifyInvitation: handleVerifyInvitation,
  invitedSignup: handleInvitedSignup,
};
