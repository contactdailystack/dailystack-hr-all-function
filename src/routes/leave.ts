import { Router, Request, Response } from 'express';
// ✅ P0.1: verifyLineToken แทน validateUserId
import { asyncHandler, verifyLineToken } from '../middleware/auth';
import { getEmployeeByLineId, getLeaveLabel } from '../services/employee';
import {
  getLeaveRequestsByEmployee,
  submitLeaveRequest as dbSubmitLeaveRequest,
} from '../services/supabase';
import { sendLeaveApprovalFlex, notifyManagerUrgent } from '../services/notification';
import { getSetting } from '../services/supabase';
import type { ApiResponse, SubmitLeavePayload, LeaveHistoryItem } from '../types';

const router = Router();

/**
 * POST /submit_leave
 * Body: { data: { type, startDate, endDate?, note? } }
 */
router.post(
  '/submit_leave',
  verifyLineToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as Request & { verifiedUserId: string }).verifiedUserId;
    const payload = req.body?.data as SubmitLeavePayload | undefined;
    const type = payload?.type;
    const startDate = payload?.startDate;
    const endDate = payload?.endDate;
    const note = payload?.note;

    if (!type || !startDate) {
      res.json({ success: false, error: 'Missing type or startDate' } satisfies ApiResponse);
      return;
    }

    const employee = await getEmployeeByLineId(userId);
    if (!employee) {
      res.json({ success: false, error: 'ไม่พบข้อมูลพนักงาน กรุณาติดต่อผู้จัดการ' } satisfies ApiResponse);
      return;
    }

    // Save leave request to Supabase
    const record = await dbSubmitLeaveRequest(
      employee.id,
      type,
      startDate,
      endDate ?? null,
      note ?? null,
      userId
    );

    // Notify manager with Flex message
    const managerLineId = await getSetting('LINE Manager ID');
    if (managerLineId) {
      const employeeName =
        employee.full_name_th ||
        `${employee.first_name_th ?? ''} ${employee.last_name_th ?? ''}`.trim();

      await sendLeaveApprovalFlex(
        managerLineId,
        employeeName,
        getLeaveLabel(type),
        startDate,
        endDate ?? null,
        note ?? null,
        {
          action: 'approve_leave',
          requestId: record.id,
          employeeId: employee.id,
          employeeLineId: userId,
        }
      );
    }

    res.json({
      success: true,
      message: 'ส่งคำขอลาสำเร็จแล้ว รอผู้จัดการอนุมัติ',
      data: null,
    } satisfies ApiResponse<null>);
  })
);

/**
 * POST /get_leave_history
 * Body: {} (userId มาจาก LINE token)
 */
router.post(
  '/get_leave_history',
  verifyLineToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as Request & { verifiedUserId: string }).verifiedUserId;

    const employee = await getEmployeeByLineId(userId);
    if (!employee) {
      res.json({ success: false, error: 'ไม่พบพนักงาน' } satisfies ApiResponse);
      return;
    }

    const requests = await getLeaveRequestsByEmployee(employee.id);

    const history: LeaveHistoryItem[] = requests.map(r => ({
      requestId: r.id,
      type: r.leave_type,
      typeLabel: getLeaveLabel(r.leave_type),
      startDate: r.start_date,
      endDate: r.end_date ?? undefined,
      status: r.status,
      note: r.employee_notes ?? '',
    }));

    res.json({ success: true, data: history } satisfies ApiResponse<LeaveHistoryItem[]>);
  })
);

export default router;
