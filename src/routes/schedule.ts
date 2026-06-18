import type { Context } from 'hono';
import { getEmployeeByLineId } from '../services/employee';
import { getUpcomingScheduleAssignments } from '../services/supabase';
import type { ApiResponse, ScheduleDay } from '../types';

const DAY_NAMES_TH = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateThai(date: Date): string {
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
}

const SHIFT_LABELS: Record<string, string> = {
  O: 'Morning Shift', Mid: 'Mid Shift', C: 'Evening Shift', Off: 'Day Off', CD: 'Day Off Swap',
  OT1: 'OT 1hr', OT2: 'OT 2hrs', OT3: 'OT 3hrs', OT4: 'OT 4hrs', OT5: 'OT 5hrs',
  VAC: 'Annual Leave', SL: 'Sick Leave', LWP: 'Unpaid Leave', LOA: 'Personal Leave',
  PL: 'Maternity Leave', ML: 'Maternity (Spouse)', MSL: 'Parental Leave',
  OL: 'Bereavement', STL: 'Sterilization Leave', TR: 'Training',
};

export async function getScheduleRoute(c: Context) {
  const userId = c.get('verifiedUserId') as string;
  const employee = await getEmployeeByLineId(userId);
  if (!employee) return c.json({ success: false, error: 'Employee not found' } satisfies ApiResponse, 400);

  const assignments = await getUpcomingScheduleAssignments(employee.id, 7);
  const today = new Date();

  const result: ScheduleDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const assignment = assignments.find(a => a.shift_date === dateStr);
    result.push({
      date: d.getDate(),
      dayName: DAY_NAMES_TH[d.getDay()],
      fullDate: formatDateThai(d),
      shift: assignment ? (SHIFT_LABELS[assignment.shift_type!] ?? assignment.shift_type) : 'No shift assigned',
      shiftCode: assignment?.shift_type ?? null,
      isHoliday: assignment?.is_holiday ?? false,
    });
  }
  return c.json({ success: true, data: result } satisfies ApiResponse<ScheduleDay[]>);
}
