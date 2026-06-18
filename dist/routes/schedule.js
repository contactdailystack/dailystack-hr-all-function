"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// ✅ P0.1: verifyLineToken แทน validateUserId
const auth_1 = require("../middleware/auth");
const employee_1 = require("../services/employee");
const supabase_1 = require("../services/supabase");
const router = (0, express_1.Router)();
const DAY_NAMES_TH = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function formatDateThai(date) {
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
router.post('/get_schedule', auth_1.verifyLineToken, (0, auth_1.asyncHandler)(async (req, res) => {
    const userId = req.verifiedUserId;
    const employee = await (0, employee_1.getEmployeeByLineId)(userId);
    if (!employee) {
        const response = { success: false, error: 'ไม่พบพนักงาน' };
        res.json(response);
        return;
    }
    const assignments = await (0, supabase_1.getUpcomingScheduleAssignments)(employee.id, 7);
    const today = new Date();
    const result = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const assignment = assignments.find(a => a.shift_date === dateStr);
        const SHIFT_LABELS = {
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
            shift: assignment ? (SHIFT_LABELS[assignment.shift_type] ?? assignment.shift_type) : 'ยังไม่มีกะ',
            shiftCode: assignment?.shift_type ?? null,
            isHoliday: assignment?.is_holiday ?? false,
        });
    }
    const response = { success: true, data: result };
    res.json(response);
}));
exports.default = router;
//# sourceMappingURL=schedule.js.map