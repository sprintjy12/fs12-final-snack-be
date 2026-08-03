import { Request, Response } from "express";
import { createMemberInvitation } from "../services/invitationService";
import asyncHandler from "../utils/asyncHandler";

const handleCreateInvitation = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;

    const invitation = await createMemberInvitation(companyId, req.body);

    res.status(201).json({
      message: "회원 초대에 성공했습니다.",
      data: invitation,
    });
  },
);

export default {
  createInvitation: handleCreateInvitation,
};