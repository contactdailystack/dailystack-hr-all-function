import { supabase } from '../config';
const db = () => supabase.client;
import type {
  Employee,
  Branch,
  ClockRecord,
  ScheduleAssignment,
  LeaveRequest,
  PayrollRecord,
} from '../types';

// ─── Employee ────────────────────────────────────────────────────────────────

export async function findEmployeeByLineId(lineUserId: string): Promise<Employee | null> {
  const { data, error } = await db()
    .from('employees')
    .select('*')
    .eq('line_user_id', lineUserId)
    .is('deleted_at', null)
    .single();

  if (error || !data) return null;
  return data as Employee;
}

export async function findEmployeeById(id: string): Promise<Employee | null> {
  const { data, error } = await db()
    .from('employees')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !data) return null;
  return data as Employee;
}

export async function getActiveEmployees(): Promise<Employee[]> {
  const { data, error } = await db()
    .from('employees')
    .select('*')
    .eq('status', 'active')
    .is('deleted_at', null);

  if (error) return [];
  return (data || []) as Employee[];
}

// ─── Branch ──────────────────────────────────────────────────────────────────

export async function getBranchByCode(code: string): Promise<Branch | null> {
  const { data, error } = await db()
    .from('branches')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data as Branch;
}

export async function getMainBranch(): Promise<Branch | null> {
  const { data, error } = await db()
    .from('branches')
    .select('*')
    .eq('is_main', true)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data as Branch;
}

export async function getAllActiveBranches(): Promise<Branch[]> {
  const { data, error } = await db()
    .from('branches')
    .select('*')
    .eq('is_active', true);

  if (error) return [];
  return (data || []) as Branch[];
}

// ─── Clock Records ───────────────────────────────────────────────────────────

export async function getTodayClockRecord(employeeId: string): Promise<ClockRecord | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await db()
    .from('clock_records')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('work_date', today)
    .is('deleted_at', null)
    .single();

  if (error || !data) return null;
  return data as ClockRecord;
}

export async function clockIn(
  employeeId: string,
  branchId: string | null,
  lat: number,
  lng: number,
  accuracy: number | null,
  geofenceValid: boolean
): Promise<ClockRecord> {
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

  const { data, error } = await db()
    .from('clock_records')
    .insert(record)
    .select()
    .single();

  if (error) throw new Error(`Failed to clock in: ${error.message}`);
  return data as ClockRecord;
}

export async function clockOut(
  recordId: string,
  lat: number,
  lng: number,
  accuracy: number | null,
  geofenceValid: boolean
): Promise<ClockRecord> {
  const now = new Date().toISOString();

  const { data, error } = await db()
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

  if (error) throw new Error(`Failed to clock out: ${error.message}`);
  return data as ClockRecord;
}

export async function getClockRecordsInRange(
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<ClockRecord[]> {
  const { data, error } = await db()
    .from('clock_records')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('work_date', startDate)
    .lte('work_date', endDate)
    .is('deleted_at', null);

  if (error) return [];
  return (data || []) as ClockRecord[];
}

// ─── Schedules ───────────────────────────────────────────────────────────────

export async function getUpcomingScheduleAssignments(
  employeeId: string,
  days = 7
): Promise<ScheduleAssignment[]> {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + days);

  const todayStr = today.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  const { data, error } = await db()
    .from('schedule_assignments')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('shift_date', todayStr)
    .lte('shift_date', endDateStr)
    .is('deleted_at', null)
    .order('shift_date', { ascending: true });

  if (error) return [];
  return (data || []) as ScheduleAssignment[];
}

// ─── Leave Requests ───────────────────────────────────────────────────────────

export async function getLeaveRequestsByEmployee(
  employeeId: string,
  year?: number
): Promise<LeaveRequest[]> {
  let query = db()
    .from('leave_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (year) {
    query = query.gte('start_date', `${year}-01-01`);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data || []) as LeaveRequest[];
}

export async function getLeaveRequestById(requestId: string): Promise<LeaveRequest | null> {
  const { data, error } = await db()
    .from('leave_requests')
    .select('*')
    .eq('id', requestId)
    .is('deleted_at', null)
    .single();

  if (error || !data) return null;
  return data as LeaveRequest;
}

export async function submitLeaveRequest(
  employeeId: string,
  leaveType: string,
  startDate: string,
  endDate: string | null,
  note: string | null,
  lineUserId: string
): Promise<LeaveRequest> {
  const now = new Date().toISOString();
  const durationDays = endDate
    ? Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1
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

  const { data, error } = await db()
    .from('leave_requests')
    .insert(record)
    .select()
    .single();

  if (error) throw new Error(`Failed to submit leave request: ${error.message}`);
  return data as LeaveRequest;
}

export async function approveLeaveRequest(
  requestId: string,
  approverId: string,
  managerNotes?: string
): Promise<LeaveRequest> {
  const { data, error } = await db()
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

  if (error) throw new Error(`Failed to approve leave: ${error.message}`);
  return data as LeaveRequest;
}

export async function rejectLeaveRequest(
  requestId: string,
  approverId: string,
  reason?: string
): Promise<LeaveRequest> {
  const { data, error } = await db()
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

  if (error) throw new Error(`Failed to reject leave: ${error.message}`);
  return data as LeaveRequest;
}

// ─── Payroll ─────────────────────────────────────────────────────────────────

export async function getPayrollRecord(
  employeeId: string,
  month: number,
  year: number
): Promise<PayrollRecord | null> {
  const { data, error } = await db()
    .from('payroll_records')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('payroll_month', month)
    .eq('payroll_year', year)
    .is('deleted_at', null)
    .single();

  if (error || !data) return null;
  return data as PayrollRecord;
}

export async function getApprovedLeavesInMonth(
  employeeId: string,
  month: number,
  year: number
): Promise<LeaveRequest[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const { data, error } = await db()
    .from('leave_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('status', 'approved')
    .lte('start_date', endDate)
    .or(`end_date.is.null,end_date.gte.${startDate}`)
    .is('deleted_at', null);

  if (error) return [];
  return (data || []) as LeaveRequest[];
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const { data, error } = await db()
    .from('settings')
    .select('setting_value')
    .eq('setting_key', key)
    .is('deleted_at', null)
    .single();

  if (error || !data) return null;
  return data.setting_value;
}
