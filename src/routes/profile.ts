import { Router, Request, Response } from 'express';
// ✅ P0.1: verifyLineToken แทน validateUserId
import { asyncHandler, verifyLineToken } from '../middleware/auth';
import { getEmployeeByLineId } from '../services/employee';
import type { ApiResponse, ProfileData } from '../types';

const router = Router();

/**
 * POST /get_profile
 * Body: {} (userId มาจาก LINE token)
 */
router.post(
  '/get_profile',
  verifyLineToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as Request & { verifiedUserId: string }).verifiedUserId;

    const employee = await getEmployeeByLineId(userId);
    if (!employee) {
      const response: ApiResponse = { success: false, error: 'ไม่พบพนักงาน' };
      res.json(response);
      return;
    }

    const name =
      employee.full_name_th ||
      `${employee.first_name_th ?? ''} ${employee.last_name_th ?? ''}`.trim() ||
      employee.nickname ||
      'ไม่ระบุ';

    const data: ProfileData = {
      id: employee.id,
      name,
      position: employee.position,
      status: employee.status,
      lineUserId: userId,
    };

    const response: ApiResponse<ProfileData> = { success: true, data };
    res.json(response);
  })
);

export default router;
