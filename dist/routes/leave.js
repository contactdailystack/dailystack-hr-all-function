"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// ✅ P0.1: verifyLineToken แทน validateUserId
const auth_1 = require("../middleware/auth");
const employee_1 = require("../services/employee");
const supabase_1 = require("../services/supabase");
const notification_1 = require("../services/notification");
const supabase_2 = require("../services/supabase");
const router = (0, express_1.Router)();
/**
 * POST /submit_leave
 * Body: { data: { type, startDate, endDate?, note? } }
 */
router.post('/submit_leave', auth_1.verifyLineToken, (0, auth_1.asyncHandler)(async (req, res) => {
    const userId = req.verifiedUserId;
    const payload = req.body?.data;
    const type = payload?.type;
    const startDate = payload?.startDate;
    const endDate = payload?.endDate;
    const note = payload?.note;
    if (!type || !startDate) {
        res.json({ success: false, error: 'Missing type or startDate' });
        return;
    }
    const employee = await (0, employee_1.getEmployeeByLineId)(userId);
    if (!employee) {
        res.json({ success: false, error: 'ไม่พบข้อมูลพนักงาน กรุณาติดต่อผู้จัดการ' });
        return;
    }
    // Save leave request to Supabase
    const record = await (0, supabase_1.submitLeaveRequest)(employee.id, type, startDate, endDate ?? null, note ?? null, userId);
    // Notify manager with Flex message
    const managerLineId = await (0, supabase_2.getSetting)('LINE Manager ID');
    if (managerLineId) {
        const employeeName = employee.full_name_th ||
            `${employee.first_name_th ?? ''} ${employee.last_name_th ?? ''}`.trim();
        await (0, notification_1.sendLeaveApprovalFlex)(managerLineId, employeeName, (0, employee_1.getLeaveLabel)(type), startDate, endDate ?? null, note ?? null, {
            action: 'approve_leave',
            requestId: record.id,
            employeeId: employee.id,
            employeeLineId: userId,
        });
    }
    res.json({
        success: true,
        message: 'ส่งคำขอลาสำเร็จแล้ว รอผู้จัดการอนุมัติ',
        data: null,
    });
}));
/**
 * POST /get_leave_history
 * Body: {} (userId มาจาก LINE token)
 */
router.post('/get_leave_history', auth_1.verifyLineToken, (0, auth_1.asyncHandler)(async (req, res) => {
    const userId = req.verifiedUserId;
    const employee = await (0, employee_1.getEmployeeByLineId)(userId);
    if (!employee) {
        res.json({ success: false, error: 'ไม่พบพนักงาน' });
        return;
    }
    const requests = await (0, supabase_1.getLeaveRequestsByEmployee)(employee.id);
    const history = requests.map(r => ({
        requestId: r.id,
        type: r.leave_type,
        typeLabel: (0, employee_1.getLeaveLabel)(r.leave_type),
        startDate: r.start_date,
        endDate: r.end_date ?? undefined,
        status: r.status,
        note: r.employee_notes ?? '',
    }));
    res.json({ success: true, data: history });
}));
exports.default = router;
//# sourceMappingURL=leave.js.map