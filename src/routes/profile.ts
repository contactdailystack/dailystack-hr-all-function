import type { Context } from 'hono';
import { getEmployeeByLineId } from '../services/employee';
import type { ApiResponse, ProfileData } from '../types';

export async function getProfileRoute(c: Context) {
  const userId = c.get('verifiedUserId') as string;
  const employee = await getEmployeeByLineId(userId);
  if (!employee) return c.json({ success: false, error: 'Employee not found' } satisfies ApiResponse, 400);
  const name = employee.full_name_th || ((employee.first_name_th ?? '') + ' ' + (employee.last_name_th ?? '')).trim() || employee.nickname || 'Unknown';
  const data: ProfileData = { id: employee.id, name, position: employee.position, status: employee.status, lineUserId: userId };
  return c.json({ success: true, data } satisfies ApiResponse<ProfileData>);
}
