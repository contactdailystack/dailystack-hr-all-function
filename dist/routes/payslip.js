"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// ✅ P0.1: verifyLineToken แทน validateUserId
const auth_1 = require("../middleware/auth");
const employee_1 = require("../services/employee");
const supabase_1 = require("../services/supabase");
const router = (0, express_1.Router)();
function getLastDay(year, month) {
    return new Date(year, month, 0).getDate();
}
function computeTax(taxableIncome) {
    if (taxableIncome <= 0)
        return 0;
    if (taxableIncome <= 150000)
        return 0;
    if (taxableIncome <= 300000)
        return (taxableIncome - 150000) * 0.05;
    if (taxableIncome <= 500000)
        return 7500 + (taxableIncome - 300000) * 0.1;
    if (taxableIncome <= 750000)
        return 27500 + (taxableIncome - 500000) * 0.15;
    if (taxableIncome <= 1000000)
        return 65000 + (taxableIncome - 750000) * 0.2;
    if (taxableIncome <= 2000000)
        return 115000 + (taxableIncome - 1000000) * 0.25;
    return 365000 + (taxableIncome - 2000000) * 0.3;
}
/**
 * POST /get_payslip
 * Body: {} (userId มาจาก LINE token)
 */
router.post('/get_payslip', auth_1.verifyLineToken, (0, auth_1.asyncHandler)(async (req, res) => {
    const userId = req.verifiedUserId;
    const employee = await (0, employee_1.getEmployeeByLineId)(userId);
    if (!employee) {
        const response = { success: false, error: 'ไม่พบพนักงาน' };
        res.json(response);
        return;
    }
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const monthName = now.toLocaleString('th-TH', { month: 'long', year: 'numeric' });
    // 1. Try pre-computed payroll record
    const payrollRecord = await (0, supabase_1.getPayrollRecord)(employee.id, month, year);
    if (payrollRecord) {
        const data = {
            empId: employee.employee_code || employee.id,
            empName: employee.full_name_th ||
                `${employee.first_name_th ?? ''} ${employee.last_name_th ?? ''}`.trim(),
            month: monthName,
            payrollYear: payrollRecord.payroll_year,
            payrollMonth: payrollRecord.payroll_month,
            baseSalary: parseFloat(String(payrollRecord.base_salary)) || 0,
            overtimeHours: parseFloat(String(payrollRecord.overtime_hours)) || 0,
            overtimeAmount: parseFloat(String(payrollRecord.overtime_amount)) || 0,
            attendanceBonus: parseFloat(String(payrollRecord.attendance_bonus)) || 0,
            serviceChargeShare: parseFloat(String(payrollRecord.service_charge_share)) || 0,
            grossSalary: parseFloat(String(payrollRecord.gross_salary)) || 0,
            socialSecurity: parseFloat(String(payrollRecord.social_security)) || 0,
            taxDeduction: parseFloat(String(payrollRecord.tax_deduction)) || 0,
            otherDeductions: parseFloat(String(payrollRecord.other_deductions)) || 0,
            netSalary: parseFloat(String(payrollRecord.net_salary)) || 0,
            isPaid: payrollRecord.is_paid,
            paidAt: payrollRecord.paid_at ?? null,
            note: payrollRecord.notes ?? null,
        };
        const response = { success: true, data };
        res.json(response);
        return;
    }
    // 2. Compute from clock_records + leaves
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${getLastDay(year, month)}`;
    const clocks = await (0, supabase_1.getClockRecordsInRange)(employee.id, startDate, endDate);
    const leaves = await (0, supabase_1.getApprovedLeavesInMonth)(employee.id, month, year);
    let totalWorkDays = 0;
    let totalHours = 0;
    let overtimeHours = 0;
    for (const r of clocks) {
        if (r.clock_in && r.clock_out) {
            totalWorkDays++;
            const hrs = parseFloat(String(r.total_hours)) || 0;
            totalHours += hrs;
            overtimeHours += Math.max(0, hrs - 8);
        }
    }
    const unpaidLeaveDays = leaves.reduce((sum, l) => sum + (parseInt(String(l.duration_days)) || 0), 0);
    const baseSalary = parseFloat(String(employee.base_salary)) || 0;
    const dailyRate = totalWorkDays > 0 ? baseSalary / totalWorkDays : 0;
    const unpaidLeaveAmount = unpaidLeaveDays * dailyRate;
    const otRate = parseFloat(String(employee.ot_rate)) || 0;
    const overtimeAmount = overtimeHours * otRate;
    const grossSalary = baseSalary + overtimeAmount - unpaidLeaveAmount;
    const socialSecurity = Math.min(baseSalary * 0.05, 750);
    const taxableIncome = grossSalary - socialSecurity;
    const taxDeduction = computeTax(taxableIncome);
    const netSalary = grossSalary - socialSecurity - taxDeduction;
    const data = {
        empId: employee.employee_code || employee.id,
        empName: employee.full_name_th ||
            `${employee.first_name_th ?? ''} ${employee.last_name_th ?? ''}`.trim(),
        month: monthName,
        payrollYear: year,
        payrollMonth: month,
        baseSalary,
        totalWorkDays,
        totalWorkHours: parseFloat(totalHours.toFixed(2)),
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
        overtimeAmount: parseFloat(overtimeAmount.toFixed(2)),
        attendanceBonus: 0,
        unpaidLeaveDays,
        unpaidLeaveAmount: parseFloat(unpaidLeaveAmount.toFixed(2)),
        serviceChargeShare: 0,
        grossSalary: parseFloat(grossSalary.toFixed(2)),
        socialSecurity: parseFloat(socialSecurity.toFixed(2)),
        taxDeduction: parseFloat(taxDeduction.toFixed(2)),
        otherDeductions: 0,
        netSalary: parseFloat(netSalary.toFixed(2)),
        isPaid: false,
        paidAt: null,
        note: 'คำนวณจากข้อมูลตอกบัตร — รอผู้จัดการยืนยัน',
    };
    const response = { success: true, data };
    res.json(response);
}));
exports.default = router;
//# sourceMappingURL=payslip.js.map