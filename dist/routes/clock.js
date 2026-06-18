"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// ✅ P0.1: verifyLineToken แทน validateUserId
const auth_1 = require("../middleware/auth");
const employee_1 = require("../services/employee");
const employee_2 = require("../services/employee");
const supabase_1 = require("../services/supabase");
const notification_1 = require("../services/notification");
const supabase_2 = require("../services/supabase");
const router = (0, express_1.Router)();
/**
 * POST /clock_in
 * Body: { data: { lat, lng, accuracy?, branch? } }
 * Auth: LINE ID Token (Bearer) หรือ dev mode: { userId }
 */
router.post('/clock_in', auth_1.verifyLineToken, // ✅ P0.1: verify ก่อนเข้าถึง
(0, auth_1.asyncHandler)(async (req, res) => {
    const userId = req.verifiedUserId;
    const payload = req.body?.data;
    const lat = payload?.lat;
    const lng = payload?.lng;
    const accuracy = payload?.accuracy;
    const branch = payload?.branch;
    // 1. Find employee
    const employee = await (0, employee_1.getEmployeeByLineId)(userId);
    if (!employee) {
        res.json({ success: false, error: 'ไม่พบข้อมูลพนักงาน กรุณาติดต่อผู้จัดการ' });
        return;
    }
    if (employee.status !== 'active') { // ✅ P1.2: lowercase — ตรงกับ Supabase ENUM
        res.json({ success: false, error: 'สถานะของคุณไม่อนุญาตให้ตอกบัตร' });
        return;
    }
    // 2. Validate GPS
    if (!isFinite(lat) || !isFinite(lng)) {
        res.json({ success: false, error: 'ข้อมูล GPS ไม่ถูกต้อง กรุณาลองใหม่' });
        return;
    }
    if (!(0, employee_2.isGpsAccuracyValid)(accuracy)) {
        res.json({
            success: false,
            error: `ความแม่นยำ GPS ไม่เพียงพอ (±${Math.round(accuracy)}m) กรุณาลองใหม่อีกครั้ง`,
        });
        return;
    }
    // 3. Geofence check
    const geofenceResult = await (0, employee_2.checkGeofence)(lat, lng, branch || 'main');
    if (!geofenceResult.inRange) {
        res.json({
            success: false,
            error: `ไม่อยู่ในรัศมีร้าน (คุณอยู่ห่าง ${geofenceResult.distance}m ต้องไม่เกิน ${geofenceResult.radiusMeters}m)`,
        });
        return;
    }
    // 4. Check already clocked in today
    const existing = await (0, supabase_1.getTodayClockRecord)(employee.id);
    if (existing?.clock_in) {
        const clockInTime = new Date(existing.clock_in).toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
        });
        res.json({
            success: false,
            error: `คุณได้ตอกบัตรเข้างานไปแล้ววันนี้ (${clockInTime})`,
        });
        return;
    }
    // 5. Clock in
    const record = await (0, supabase_1.clockIn)(employee.id, existing?.branch_id || null, lat, lng, accuracy ?? null, geofenceResult.inRange);
    // 6. Notify manager
    const managerLineId = await (0, supabase_2.getSetting)('LINE Manager ID');
    if (managerLineId) {
        const timeStr = new Date(record.clock_in).toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
        });
        const name = employee.full_name_th || `${employee.first_name_th} ${employee.last_name_th}`;
        await (0, notification_1.notifyManagerUrgent)(`${name} ตอกบัตรเข้างาน (${timeStr})`, managerLineId);
    }
    res.json({
        success: true,
        message: 'ตอกบัตรเข้างานสำเร็จ',
        data: {
            clockIn: record.clock_in,
            branch: branch || 'main',
        },
    });
}));
/**
 * POST /clock_out
 * Body: { data: { lat, lng, accuracy?, branch? } }
 */
router.post('/clock_out', auth_1.verifyLineToken, (0, auth_1.asyncHandler)(async (req, res) => {
    const userId = req.verifiedUserId;
    const payload = req.body?.data;
    const lat = payload?.lat;
    const lng = payload?.lng;
    const accuracy = payload?.accuracy;
    const branch = payload?.branch;
    // 1. Find employee
    const employee = await (0, employee_1.getEmployeeByLineId)(userId);
    if (!employee) {
        res.json({ success: false, error: 'ไม่พบข้อมูลพนักงาน กรุณาติดต่อผู้จัดการ' });
        return;
    }
    // 2. Validate GPS
    if (!isFinite(lat) || !isFinite(lng)) {
        res.json({ success: false, error: 'ข้อมูล GPS ไม่ถูกต้อง กรุณาลองใหม่' });
        return;
    }
    if (!(0, employee_2.isGpsAccuracyValid)(accuracy)) {
        res.json({
            success: false,
            error: `ความแม่นยำ GPS ไม่เพียงพอ (±${Math.round(accuracy)}m) กรุณาลองใหม่อีกครั้ง`,
        });
        return;
    }
    // 3. Geofence check
    const geofenceResult = await (0, employee_2.checkGeofence)(lat, lng, branch || 'main');
    if (!geofenceResult.inRange) {
        res.json({
            success: false,
            error: `ไม่อยู่ในรัศมีร้าน (คุณอยู่ห่าง ${geofenceResult.distance}m ต้องไม่เกิน ${geofenceResult.radiusMeters}m)`,
        });
        return;
    }
    // 4. Check existing record
    const existing = await (0, supabase_1.getTodayClockRecord)(employee.id);
    if (!existing?.clock_in) {
        res.json({ success: false, error: 'คุณยังไม่ได้ตอกบัตรเข้างานวันนี้' });
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
        });
        return;
    }
    // 5. Clock out
    const record = await (0, supabase_1.clockOut)(existing.id, lat, lng, accuracy ?? null, geofenceResult.inRange);
    // 6. Calculate hours
    const hours = (new Date(record.clock_out).getTime() - new Date(record.clock_in).getTime()) /
        (1000 * 60 * 60);
    // 7. Notify manager
    const managerLineId = await (0, supabase_2.getSetting)('LINE Manager ID');
    if (managerLineId) {
        const timeStr = new Date(record.clock_out).toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
        });
        const name = employee.full_name_th || `${employee.first_name_th} ${employee.last_name_th}`;
        await (0, notification_1.notifyManagerUrgent)(`${name} ตอกบัตรออกงาน (${timeStr}) | ทำงาน ${hours.toFixed(1)} ชม.`, managerLineId);
    }
    res.json({
        success: true,
        message: 'ตอกบัตรออกงานสำเร็จ',
        data: {
            clockOut: record.clock_out,
            totalHours: parseFloat(hours.toFixed(1)),
        },
    });
}));
/**
 * POST /get_clock_status
 * Body: {} (userId มาจาก LINE token แล้ว)
 */
router.post('/get_clock_status', auth_1.verifyLineToken, (0, auth_1.asyncHandler)(async (req, res) => {
    const userId = req.verifiedUserId;
    const employee = await (0, employee_1.getEmployeeByLineId)(userId);
    if (!employee) {
        res.json({ success: false, error: 'ไม่พบพนักงาน' });
        return;
    }
    const record = await (0, supabase_1.getTodayClockRecord)(employee.id);
    const data = {
        clockIn: record?.clock_in ?? null,
        clockOut: record?.clock_out ?? null,
        totalHours: record?.total_hours ?? null,
    };
    res.json({ success: true, data });
}));
exports.default = router;
//# sourceMappingURL=clock.js.map