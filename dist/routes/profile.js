"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// ✅ P0.1: verifyLineToken แทน validateUserId
const auth_1 = require("../middleware/auth");
const employee_1 = require("../services/employee");
const router = (0, express_1.Router)();
/**
 * POST /get_profile
 * Body: {} (userId มาจาก LINE token)
 */
router.post('/get_profile', auth_1.verifyLineToken, (0, auth_1.asyncHandler)(async (req, res) => {
    const userId = req.verifiedUserId;
    const employee = await (0, employee_1.getEmployeeByLineId)(userId);
    if (!employee) {
        const response = { success: false, error: 'ไม่พบพนักงาน' };
        res.json(response);
        return;
    }
    const name = employee.full_name_th ||
        `${employee.first_name_th ?? ''} ${employee.last_name_th ?? ''}`.trim() ||
        employee.nickname ||
        'ไม่ระบุ';
    const data = {
        id: employee.id,
        name,
        position: employee.position,
        status: employee.status,
        lineUserId: userId,
    };
    const response = { success: true, data };
    res.json(response);
}));
exports.default = router;
//# sourceMappingURL=profile.js.map