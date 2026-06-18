import type { Context } from 'hono';
import { getEmployeeByLineId, getLeaveLabel } from '../services/employee';
import { getLeaveRequestsByEmployee, submitLeaveRequest as dbSubmitLeaveRequest, getSetting } from '../services/supabase';
import { sendLeaveApprovalFlex } from '../services/notification';
import type { ApiResponse, SubmitLeavePayload, LeaveHistoryItem } from '../types';

export async function submitLeaveRoute(c: Context) {
  const userId = c.get('verifiedUserId') as string;
  const payload = (await c.req.json())?.data as SubmitLeavePayload | undefined;
  const { type, startDate, endDate, note } = payload ?? {};

  if (!type || !startDate) return c.json({ success: false, error: 'Missing type or startDate' } satisfies ApiResponse, 400);

  const employee = await getEmployeeByLineId(userId);
  if (!employee) return c.json({ success: false, error: 'Employee not found' } satisfies ApiResponse, 400);

  const record = await dbSubmitLeaveRequest(employee.id, type, startDate, endDate ?? null, note ?? null, userId);
  const managerLineId = await getSetting('LINE Manager ID');
  if (managerLineId) {
    const name = employee.full_name_th || ((employee.first_name_th ?? '') + ' ' + (employee.last_name_th ?? '')).trim();
    await sendLeaveApprovalFlex(managerLineId, name, getLeaveLabel(type), startDate, endDate ?? null, note ?? null, {
      action: 'approve_leave', requestId: record.id, employeeId: employee.id, employeeLineId: userId,
    });
  }
  return c.json({ success: true, message: 'Leave request submitted. Awaiting manager approval.', data: null } satisfies ApiResponse<null>);
}

export async function getLeaveHistoryRoute(c: Context) {
  const userId = c.get('verifiedUserId') as string;
  const employee = await getEmployeeByLineId(userId);
  if (!employee) return c.json({ success: false, error: 'Employee not found' } satisfies ApiResponse, 400);
  const requests = await getLeaveRequestsByEmployee(employee.id);
  const history: LeaveHistoryItem[] = requests.map(r => ({
    requestId: r.id, type: r.leave_type, typeLabel: getLeaveLabel(r.leave_type),
    startDate: r.start_date, endDate: r.end_date ?? undefined, status: r.status, note: r.employee_notes ?? '',
  }));
  return c.json({ success: true, data: history } satisfies ApiResponse<LeaveHistoryItem[]>);
}
