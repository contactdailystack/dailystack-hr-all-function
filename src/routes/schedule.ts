import { Router, Request, Response } from 'express';
// ✅ P0.1: verifyLineToken แทน validateUserId
import { asyncHandler, verifyLineToken } from '../middleware/auth';
import { getEmployeeByLineId } from '../services/employee';
import { getUpcomingScheduleAssignments } from '../services/supabase';
import type { ApiResponse, ScheduleDay } from '../types';

const router = Router();

const DAY_NAMES_TH = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateThai(date: Date): string {
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * POST /get_schedule
 * Body: {} (userId มาจาก LINE token)
 */
router.post(
  '/get_schedule',
  verifyLineToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as Request & { verifiedUserId: string }).verifiedUserId;

    const employee = await getEmployeeByLineId(userId);
    if (!employee) {
      const response: ApiResponse = { success: false, error: 'ไม่พบพนักงาน' };
      res.json(response);
      return;
    }

    const assignments = await getUpcomingScheduleAssignments(employee.id, 7);
    const today = new Date();

    const result: ScheduleDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const assignment = assignments.find(a => a.shift_date === dateStr);

      const SHIFT_LABELS: Record<string, string> = {
        O: 'กะเปิด (เช้า)',
        Mid: 'กะกลาง',
        C: 'กะปิด (บ่าย)',
        Off: 'วันหยุด',
        CD: 'เปลี่ยนวันหยุด',
        OT1: 'OT 1 ชม.',
        OT2: 'OT 2 ชม.',
        OT3: 'OT 3 ชม.',
        OT4: 'OT 4 ชม.',
        OT5: 'OT 5 ชม.',
        VAC: 'ลาพักร้อน',
        SL: 'ลาป่วย',
        LWP: 'ลาไม่รับค่าจ้าง',
        LOA: 'ลากิจ',
        PL: 'ลาคลอด',
        ML: 'ลาคลอดบุตร',
        MSL: 'ลาพักเลี้ยงบุตร',
        OL: 'ลางานศพ',
        STL: 'ลาทำหมัน',
        TR: 'ลาฝึกอบรม',
      };

      result.push({
        date: d.getDate(),
        dayName: DAY_NAMES_TH[d.getDay()],
        fullDate: formatDateThai(d),
        shift: assignment ? (SHIFT_LABELS[assignment.shift_type!] ?? assignment.shift_type) : 'ยังไม่มีกะ',
        shiftCode: assignment?.shift_type ?? null,
        isHoliday: assignment?.is_holiday ?? false,
      });
    }

    const response: ApiResponse<ScheduleDay[]> = { success: true, data: result };
    res.json(response);
  })
);

export default router;
