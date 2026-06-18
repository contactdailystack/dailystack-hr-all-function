"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findEmployeeByLineId = findEmployeeByLineId;
exports.findEmployeeById = findEmployeeById;
exports.getActiveEmployees = getActiveEmployees;
exports.getBranchByCode = getBranchByCode;
exports.getMainBranch = getMainBranch;
exports.getAllActiveBranches = getAllActiveBranches;
exports.getTodayClockRecord = getTodayClockRecord;
exports.clockIn = clockIn;
exports.clockOut = clockOut;
exports.getClockRecordsInRange = getClockRecordsInRange;
exports.getUpcomingScheduleAssignments = getUpcomingScheduleAssignments;
exports.getLeaveRequestsByEmployee = getLeaveRequestsByEmployee;
exports.getLeaveRequestById = getLeaveRequestById;
exports.submitLeaveRequest = submitLeaveRequest;
exports.approveLeaveRequest = approveLeaveRequest;
exports.rejectLeaveRequest = rejectLeaveRequest;
exports.getPayrollRecord = getPayrollRecord;
exports.getApprovedLeavesInMonth = getApprovedLeavesInMonth;
exports.getSetting = getSetting;
const config_1 = require("../config");
// ─── Employee ────────────────────────────────────────────────────────────────
async function findEmployeeByLineId(lineUserId) {
    const { data, error } = await config_1.supabase
        .from('employees')
        .select('*')
        .eq('line_user_id', lineUserId)
        .is('deleted_at', null)
        .single();
    if (error || !data)
        return null;
    return data;
}
async function findEmployeeById(id) {
    const { data, error } = await config_1.supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();
    if (error || !data)
        return null;
    return data;
}
async function getActiveEmployees() {
    const { data, error } = await config_1.supabase
        .from('employees')
        .select('*')
        .eq('status', 'active')
        .is('deleted_at', null);
    if (error)
        return [];
    return (data || []);
}
// ─── Branch ──────────────────────────────────────────────────────────────────
async function getBranchByCode(code) {
    const { data, error } = await config_1.supabase
        .from('branches')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();
    if (error || !data)
        return null;
    return data;
}
async function getMainBranch() {
    const { data, error } = await config_1.supabase
        .from('branches')
        .select('*')
        .eq('is_main', true)
        .eq('is_active', true)
        .single();
    if (error || !data)
        return null;
    return data;
}
async function getAllActiveBranches() {
    const { data, error } = await config_1.supabase
        .from('branches')
        .select('*')
        .eq('is_active', true);
    if (error)
        return [];
    return (data || []);
}
// ─── Clock Records ───────────────────────────────────────────────────────────
async function getTodayClockRecord(employeeId) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await config_1.supabase
        .from('clock_records')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('work_date', today)
        .is('deleted_at', null)
        .single();
    if (error || !data)
        return null;
    return data;
}
async function clockIn(employeeId, branchId, lat, lng, accuracy, geofenceValid) {
    const today = new Date().toISOString().split('T')[0];
    const record = {
        employee_id: employeeId,
        branch_id: branchId,
        work_date: today,
        clock_in: new Date().toISOString(),
        clock_in_lat: lat,
        clock_in_lng: lng,
        clock_in_accuracy: accuracy,
        clock_in_geofence_valid: geofenceValid,
        status: 'clocked_in',
    };
    const { data, error } = await config_1.supabase
        .from('clock_records')
        .insert(record)
        .select()
        .single();
    if (error)
        throw new Error(`Failed to clock in: ${error.message}`);
    return data;
}
async function clockOut(recordId, lat, lng, accuracy, geofenceValid) {
    const now = new Date().toISOString();
    const { data, error } = await config_1.supabase
        .from('clock_records')
        .update({
        clock_out: now,
        clock_out_lat: lat,
        clock_out_lng: lng,
        clock_out_accuracy: accuracy,
        clock_out_geofence_valid: geofenceValid,
        status: 'clocked_out',
    })
        .eq('id', recordId)
        .select()
        .single();
    if (error)
        throw new Error(`Failed to clock out: ${error.message}`);
    return data;
}
async function getClockRecordsInRange(employeeId, startDate, endDate) {
    const { data, error } = await config_1.supabase
        .from('clock_records')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .is('deleted_at', null);
    if (error)
        return [];
    return (data || []);
}
// ─── Schedules ───────────────────────────────────────────────────────────────
async function getUpcomingScheduleAssignments(employeeId, days = 7) {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + days);
    const todayStr = today.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const { data, error } = await config_1.supabase
        .from('schedule_assignments')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('shift_date', todayStr)
        .lte('shift_date', endDateStr)
        .is('deleted_at', null)
        .order('shift_date', { ascending: true });
    if (error)
        return [];
    return (data || []);
}
// ─── Leave Requests ───────────────────────────────────────────────────────────
async function getLeaveRequestsByEmployee(employeeId, year) {
    let query = config_1.supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
    if (year) {
        query = query.gte('start_date', `${year}-01-01`);
    }
    const { data, error } = await query;
    if (error)
        return [];
    return (data || []);
}
async function getLeaveRequestById(requestId) {
    const { data, error } = await config_1.supabase
        .from('leave_requests')
        .select('*')
        .eq('id', requestId)
        .is('deleted_at', null)
        .single();
    if (error || !data)
        return null;
    return data;
}
async function submitLeaveRequest(employeeId, leaveType, startDate, endDate, note, lineUserId) {
    const now = new Date().toISOString();
    const durationDays = endDate
        ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 1;
    const record = {
        employee_id: employeeId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        duration_days: durationDays,
        status: 'pending',
        employee_notes: note,
        line_user_id: lineUserId,
        created_at: now,
        updated_at: now,
    };
    const { data, error } = await config_1.supabase
        .from('leave_requests')
        .insert(record)
        .select()
        .single();
    if (error)
        throw new Error(`Failed to submit leave request: ${error.message}`);
    return data;
}
async function approveLeaveRequest(requestId, approverId, managerNotes) {
    const { data, error } = await config_1.supabase
        .from('leave_requests')
        .update({
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
        manager_notes: managerNotes,
        updated_at: new Date().toISOString(),
    })
        .eq('id', requestId)
        .select()
        .single();
    if (error)
        throw new Error(`Failed to approve leave: ${error.message}`);
    return data;
}
async function rejectLeaveRequest(requestId, approverId, reason) {
    const { data, error } = await config_1.supabase
        .from('leave_requests')
        .update({
        status: 'rejected',
        approved_by: approverId,
        rejected_reason: reason,
        updated_at: new Date().toISOString(),
    })
        .eq('id', requestId)
        .select()
        .single();
    if (error)
        throw new Error(`Failed to reject leave: ${error.message}`);
    return data;
}
// ─── Payroll ─────────────────────────────────────────────────────────────────
async function getPayrollRecord(employeeId, month, year) {
    const { data, error } = await config_1.supabase
        .from('payroll_records')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('payroll_month', month)
        .eq('payroll_year', year)
        .is('deleted_at', null)
        .single();
    if (error || !data)
        return null;
    return data;
}
async function getApprovedLeavesInMonth(employeeId, month, year) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    const { data, error } = await config_1.supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'approved')
        .lte('start_date', endDate)
        .or(`end_date.is.null,end_date.gte.${startDate}`)
        .is('deleted_at', null);
    if (error)
        return [];
    return (data || []);
}
// ─── Settings ────────────────────────────────────────────────────────────────
async function getSetting(key) {
    const { data, error } = await config_1.supabase
        .from('settings')
        .select('setting_value')
        .eq('setting_key', key)
        .is('deleted_at', null)
        .single();
    if (error || !data)
        return null;
    return data.setting_value;
}
//# sourceMappingURL=supabase.js.map