import { Router, Request, Response } from 'express';
// ✅ P0.1: verifyLineToken แทน validateUserId
import { asyncHandler, verifyLineToken } from '../middleware/auth';
import { getEmployeeByLineId } from '../services/employee';
import { checkGeofence, isGpsAccuracyValid } from '../services/employee';
import {
  getTodayClockRecord,
  clockIn as dbClockIn,
  clockOut as dbClockOut,
} from '../services/supabase';
import { notifyManagerUrgent } from '../services/notification';
import { getSetting } from '../services/supabase';
import type { ApiResponse, ClockInPayload, ClockOutPayload, ClockStatusData } from '../types';

const router = Router();

/**
 * POST /clock_in
 * Body: { data: { lat, lng, accuracy?, branch? } }
 * Auth: LINE ID Token (Bearer) หรือ dev mode: { userId }
 */
router.post(
  '/clock_in',
  verifyLineToken, // ✅ P0.1: verify ก่อนเข้าถึง
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as Request & { verifiedUserId: string }).verifiedUserId;
    const payload = req.body?.data as ClockInPayload | undefined;
    const lat = payload?.lat;
    const lng = payload?.lng;
    const accuracy = payload?.accuracy;
    const branch = payload?.branch;

    // 1. Find employee
    const employee = await getEmployeeByLineId(userId);
    if (!employee) {
      res.json({ success: false, error: 'ไม่พบข้อมูลพนักงาน กรุณาติดต่อผู้จัดการ' } satisfies ApiResponse);
      return;
    }

    if (employee.status !== 'active') { // ✅ P1.2: lowercase — ตรงกับ Supabase ENUM
      res.json({ success: false, error: 'สถานะของคุณไม่อนุญาตให้ตอกบัตร' } satisfies ApiResponse);
      return;
    }

    // 2. Validate GPS
    if (!isFinite(lat!) || !isFinite(lng!)) {
      res.json({ success: false, error: 'ข้อมูล GPS ไม่ถูกต้อง กรุณาลองใหม่' } satisfies ApiResponse);
      return;
    }

    if (!isGpsAccuracyValid(accuracy)) {
      res.json({
        success: false,
        error: `ความแม่นยำ GPS ไม่เพียงพอ (±${Math.round(accuracy!) }m) กรุณาลองใหม่อีกครั้ง`,
      } satisfies ApiResponse);
      return;
    }

    // 3. Geofence check
    const geofenceResult = await checkGeofence(lat!, lng!, branch || 'main');
    if (!geofenceResult.inRange) {
      res.json({
        success: false,
        error: `ไม่อยู่ในรัศมีร้าน (คุณอยู่ห่าง ${geofenceResult.distance}m ต้องไม่เกิน ${geofenceResult.radiusMeters}m)`,
      } satisfies ApiResponse);
      return;
    }

    // 4. Check already clocked in today
    const existing = await getTodayClockRecord(employee.id);
    if (existing?.clock_in) {
      const clockInTime = new Date(existing.clock_in).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      });
      res.json({
        success: false,
        error: `คุณได้ตอกบัตรเข้างานไปแล้ววันนี้ (${clockInTime})`,
      } satisfies ApiResponse);
      return;
    }

    // 5. Clock in
    const record = await dbClockIn(
      employee.id,
      existing?.branch_id || null,
      lat!,
      lng!,
      accuracy ?? null,
      geofenceResult.inRange
    );

    // 6. Notify manager
    const managerLineId = await getSetting('LINE Manager ID');
    if (managerLineId) {
      const timeStr = new Date(record.clock_in!).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const name = employee.full_name_th || `${employee.first_name_th} ${employee.last_name_th}`;
      await notifyManagerUrgent(`${name} ตอกบัตรเข้างาน (${timeStr})`, managerLineId);
    }

    res.json({
      success: true,
      message: 'ตอกบัตรเข้างานสำเร็จ',
      data: {
        clockIn: record.clock_in!,
        branch: branch || 'main',
      },
    } satisfies ApiResponse<{ clockIn: string; branch: string }>);
  })
);

/**
 * POST /clock_out
 * Body: { data: { lat, lng, accuracy?, branch? } }
 */
router.post(
  '/clock_out',
  verifyLineToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as Request & { verifiedUserId: string }).verifiedUserId;
    const payload = req.body?.data as ClockOutPayload | undefined;
    const lat = payload?.lat;
    const lng = payload?.lng;
    const accuracy = payload?.accuracy;
    const branch = payload?.branch;

    // 1. Find employee
    const employee = await getEmployeeByLineId(userId);
    if (!employee) {
      res.json({ success: false, error: 'ไม่พบข้อมูลพนักงาน กรุณาติดต่อผู้จัดการ' } satisfies ApiResponse);
      return;
    }

    // 2. Validate GPS
    if (!isFinite(lat!) || !isFinite(lng!)) {
      res.json({ success: false, error: 'ข้อมูล GPS ไม่ถูกต้อง กรุณาลองใหม่' } satisfies ApiResponse);
      return;
    }

    if (!isGpsAccuracyValid(accuracy)) {
      res.json({
        success: false,
        error: `ความแม่นยำ GPS ไม่เพียงพอ (±${Math.round(accuracy!) }m) กรุณาลองใหม่อีกครั้ง`,
      } satisfies ApiResponse);
      return;
    }

    // 3. Geofence check
    const geofenceResult = await checkGeofence(lat!, lng!, branch || 'main');
    if (!geofenceResult.inRange) {
      res.json({
        success: false,
        error: `ไม่อยู่ในรัศมีร้าน (คุณอยู่ห่าง ${geofenceResult.distance}m ต้องไม่เกิน ${geofenceResult.radiusMeters}m)`,
      } satisfies ApiResponse);
      return;
    }

    // 4. Check existing record
    const existing = await getTodayClockRecord(employee.id);
    if (!existing?.clock_in) {
      res.json({ success: false, error: 'คุณยังไม่ได้ตอกบัตรเข้างานวันนี้' } satisfies ApiResponse);
      return;
    }

    if (existing.clock_out) {
      const clockOutTime = new Date(existing.clock_out).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      });
      res.json({
        success: false,
        error: `คุณได้ตอกบัตรออกไปแล้ว (${clockOutTime})`,
      } satisfies ApiResponse);
      return;
    }

    // 5. Clock out
    const record = await dbClockOut(
      existing.id,
      lat!,
      lng!,
      accuracy ?? null,
      geofenceResult.inRange
    );

    // 6. Calculate hours
    const hours =
      (new Date(record.clock_out!).getTime() - new Date(record.clock_in!).getTime()) /
      (1000 * 60 * 60);

    // 7. Notify manager
    const managerLineId = await getSetting('LINE Manager ID');
    if (managerLineId) {
      const timeStr = new Date(record.clock_out!).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const name = employee.full_name_th || `${employee.first_name_th} ${employee.last_name_th}`;
      await notifyManagerUrgent(
        `${name} ตอกบัตรออกงาน (${timeStr}) | ทำงาน ${hours.toFixed(1)} ชม.`,
        managerLineId
      );
    }

    res.json({
      success: true,
      message: 'ตอกบัตรออกงานสำเร็จ',
      data: {
        clockOut: record.clock_out!,
        totalHours: parseFloat(hours.toFixed(1)),
      },
    } satisfies ApiResponse<{ clockOut: string; totalHours: number }>);
  })
);

/**
 * POST /get_clock_status
 * Body: {} (userId มาจาก LINE token แล้ว)
 */
router.post(
  '/get_clock_status',
  verifyLineToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as Request & { verifiedUserId: string }).verifiedUserId;

    const employee = await getEmployeeByLineId(userId);
    if (!employee) {
      res.json({ success: false, error: 'ไม่พบพนักงาน' } satisfies ApiResponse);
      return;
    }

    const record = await getTodayClockRecord(employee.id);

    const data: ClockStatusData = {
      clockIn: record?.clock_in ?? null,
      clockOut: record?.clock_out ?? null,
      totalHours: record?.total_hours ?? null,
    };

    res.json({ success: true, data } satisfies ApiResponse<ClockStatusData>);
  })
);

export default router;
