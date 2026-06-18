import type { Context } from 'hono';
import { getEmployeeByLineId, checkGeofence, isGpsAccuracyValid } from '../services/employee';
import { getTodayClockRecord, clockIn as dbClockIn, clockOut as dbClockOut, getSetting } from '../services/supabase';
import { notifyManagerUrgent } from '../services/notification';
import type { ApiResponse, ClockInPayload, ClockOutPayload, ClockStatusData } from '../types';

export async function clockInRoute(c: Context) {
  const userId = c.get('verifiedUserId') as string;
  const payload = (await c.req.json())?.data as ClockInPayload | undefined;
  const { lat, lng, accuracy, branch } = payload ?? {};

  const employee = await getEmployeeByLineId(userId);
  if (!employee) return c.json({ success: false, error: 'Employee not found' } satisfies ApiResponse, 400);
  if (employee.status !== 'active') return c.json({ success: false, error: 'Status does not allow clock in' } satisfies ApiResponse, 400);
  if (!isFinite(lat!) || !isFinite(lng!)) return c.json({ success: false, error: 'Invalid GPS data' } satisfies ApiResponse, 400);
  if (!isGpsAccuracyValid(accuracy)) return c.json({ success: false, error: 'GPS accuracy too low' } satisfies ApiResponse, 400);

  const geofenceResult = await checkGeofence(lat!, lng!, branch || 'main');
  if (!geofenceResult.inRange) return c.json({ success: false, error: 'Outside branch radius' } satisfies ApiResponse, 400);

  const existing = await getTodayClockRecord(employee.id);
  if (existing?.clock_in) {
    const clockInTime = new Date(existing.clock_in).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return c.json({ success: false, error: 'Already clocked in today (' + clockInTime + ')' } satisfies ApiResponse, 400);
  }

  const record = await dbClockIn(employee.id, existing?.branch_id || null, lat!, lng!, accuracy ?? null, geofenceResult.inRange);
  const managerLineId = await getSetting('LINE Manager ID');
  if (managerLineId) {
    const timeStr = new Date(record.clock_in!).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const name = employee.full_name_th || (employee.first_name_th + ' ' + employee.last_name_th);
    await notifyManagerUrgent(name + ' Clock In (' + timeStr + ')', managerLineId);
  }
  return c.json({ success: true, message: 'Clock in successful', data: { clockIn: record.clock_in!, branch: branch || 'main' } } satisfies ApiResponse);
}

export async function clockOutRoute(c: Context) {
  const userId = c.get('verifiedUserId') as string;
  const payload = (await c.req.json())?.data as ClockOutPayload | undefined;
  const { lat, lng, accuracy, branch } = payload ?? {};

  const employee = await getEmployeeByLineId(userId);
  if (!employee) return c.json({ success: false, error: 'Employee not found' } satisfies ApiResponse, 400);
  if (!isFinite(lat!) || !isFinite(lng!)) return c.json({ success: false, error: 'Invalid GPS data' } satisfies ApiResponse, 400);
  if (!isGpsAccuracyValid(accuracy)) return c.json({ success: false, error: 'GPS accuracy too low' } satisfies ApiResponse, 400);

  const geofenceResult = await checkGeofence(lat!, lng!, branch || 'main');
  if (!geofenceResult.inRange) return c.json({ success: false, error: 'Outside branch radius' } satisfies ApiResponse, 400);

  const existing = await getTodayClockRecord(employee.id);
  if (!existing?.clock_in) return c.json({ success: false, error: 'Not clocked in today' } satisfies ApiResponse, 400);
  if (existing.clock_out) {
    const clockOutTime = new Date(existing.clock_out).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return c.json({ success: false, error: 'Already clocked out today (' + clockOutTime + ')' } satisfies ApiResponse, 400);
  }

  const record = await dbClockOut(existing.id, lat!, lng!, accuracy ?? null, geofenceResult.inRange);
  const hours = (new Date(record.clock_out!).getTime() - new Date(record.clock_in!).getTime()) / (1000 * 60 * 60);
  const managerLineId = await getSetting('LINE Manager ID');
  if (managerLineId) {
    const timeStr = new Date(record.clock_out!).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const name = employee.full_name_th || (employee.first_name_th + ' ' + employee.last_name_th);
    await notifyManagerUrgent(name + ' Clock Out (' + timeStr + ') | ' + hours.toFixed(1) + ' hrs', managerLineId);
  }
  return c.json({ success: true, message: 'Clock out successful', data: { clockOut: record.clock_out!, totalHours: parseFloat(hours.toFixed(1)) } } satisfies ApiResponse);
}

export async function getClockStatusRoute(c: Context) {
  const userId = c.get('verifiedUserId') as string;
  const employee = await getEmployeeByLineId(userId);
  if (!employee) return c.json({ success: false, error: 'Employee not found' } satisfies ApiResponse, 400);
  const record = await getTodayClockRecord(employee.id);
  const data: ClockStatusData = { clockIn: record?.clock_in ?? null, clockOut: record?.clock_out ?? null, totalHours: record?.total_hours ?? null };
  return c.json({ success: true, data } satisfies ApiResponse<ClockStatusData>);
}
