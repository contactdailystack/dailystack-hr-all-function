import type { Context } from 'hono';
import { getEmployeeByLineId } from '../services/employee';
import { getPayrollRecord, getClockRecordsInRange, getApprovedLeavesInMonth } from '../services/supabase';
import type { ApiResponse, PayslipData } from '../types';

function getLastDay(year: number, month: number): number { return new Date(year, month, 0).getDate(); }

function computeTax(ti: number): number {
  if (ti <= 0) return 0;
  if (ti <= 150000) return 0;
  if (ti <= 300000) return (ti - 150000) * 0.05;
  if (ti <= 500000) return 7500 + (ti - 300000) * 0.1;
  if (ti <= 750000) return 27500 + (ti - 500000) * 0.15;
  if (ti <= 1000000) return 65000 + (ti - 750000) * 0.2;
  if (ti <= 2000000) return 115000 + (ti - 1000000) * 0.25;
  return 365000 + (ti - 2000000) * 0.3;
}

export async function getPayslipRoute(c: Context) {
  const userId = c.get('verifiedUserId') as string;
  const employee = await getEmployeeByLineId(userId);
  if (!employee) return c.json({ success: false, error: 'Employee not found' } satisfies ApiResponse, 400);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthName = now.toLocaleString('th-TH', { month: 'long', year: 'numeric' });

  const payrollRecord = await getPayrollRecord(employee.id, month, year);
  if (payrollRecord) {
    const data: PayslipData = {
      empId: employee.employee_code || employee.id,
      empName: employee.full_name_th || ((employee.first_name_th ?? '') + ' ' + (employee.last_name_th ?? '')).trim(),
      month: monthName, payrollYear: payrollRecord.payroll_year, payrollMonth: payrollRecord.payroll_month,
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
      isPaid: payrollRecord.is_paid, paidAt: payrollRecord.paid_at ?? null, note: payrollRecord.notes ?? null,
    };
    return c.json({ success: true, data } satisfies ApiResponse<PayslipData>);
  }

  const startDate = year + '-' + String(month).padStart(2,'0') + '-01';
  const endDate = year + '-' + String(month).padStart(2,'0') + '-' + String(getLastDay(year, month)).padStart(2,'0');
  const clocks = await getClockRecordsInRange(employee.id, startDate, endDate);
  const leaves = await getApprovedLeavesInMonth(employee.id, month, year);

  let totalWorkDays = 0, totalHours = 0, overtimeHours = 0;
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

  const data: PayslipData = {
    empId: employee.employee_code || employee.id,
    empName: employee.full_name_th || ((employee.first_name_th ?? '') + ' ' + (employee.last_name_th ?? '')).trim(),
    month: monthName, payrollYear: year, payrollMonth: month, baseSalary,
    totalWorkDays, totalWorkHours: parseFloat(totalHours.toFixed(2)),
    overtimeHours: parseFloat(overtimeHours.toFixed(2)), overtimeAmount: parseFloat(overtimeAmount.toFixed(2)),
    attendanceBonus: 0, unpaidLeaveDays, unpaidLeaveAmount: parseFloat(unpaidLeaveAmount.toFixed(2)),
    serviceChargeShare: 0, grossSalary: parseFloat(grossSalary.toFixed(2)),
    socialSecurity: parseFloat(socialSecurity.toFixed(2)), taxDeduction: parseFloat(taxDeduction.toFixed(2)),
    otherDeductions: 0, netSalary: parseFloat(netSalary.toFixed(2)), isPaid: false, paidAt: null,
    note: 'Calculated from clock records - awaiting confirmation',
  };
  return c.json({ success: true, data } satisfies ApiResponse<PayslipData>);
}
