"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEAVE_LABELS = void 0;
exports.getEmployeeByLineId = getEmployeeByLineId;
exports.getEmployeeById = getEmployeeById;
exports.checkGeofence = checkGeofence;
exports.isGpsAccuracyValid = isGpsAccuracyValid;
exports.getLeaveLabel = getLeaveLabel;
const supabase_1 = require("./supabase");
const config_1 = require("../config");
// ─── Employee Lookup ──────────────────────────────────────────────────────────
async function getEmployeeByLineId(lineUserId) {
    return (0, supabase_1.findEmployeeByLineId)(lineUserId);
}
async function getEmployeeById(id) {
    return (0, supabase_1.findEmployeeById)(id);
}
// ─── Geofence ────────────────────────────────────────────────────────────────
/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in meters.
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
/**
 * Get geofence for a branch (from DB or default config).
 */
async function getBranchGeofence(branchCode) {
    if (branchCode && branchCode !== 'main') {
        const branch = await (0, supabase_1.getBranchByCode)(branchCode);
        if (branch && branch.geofence_center_lat && branch.geofence_center_lng) {
            return {
                lat: Number(branch.geofence_center_lat),
                lng: Number(branch.geofence_center_lng),
                radius: branch.geofence_radius_meters,
            };
        }
    }
    // Try main branch from DB first
    const mainBranch = await (0, supabase_1.getMainBranch)();
    if (mainBranch && mainBranch.geofence_center_lat && mainBranch.geofence_center_lng) {
        return {
            lat: Number(mainBranch.geofence_center_lat),
            lng: Number(mainBranch.geofence_center_lng),
            radius: mainBranch.geofence_radius_meters,
        };
    }
    // Fallback to config default
    return {
        lat: config_1.config.geofence.defaultBranch.lat,
        lng: config_1.config.geofence.defaultBranch.lng,
        radius: config_1.config.geofence.defaultBranch.radius,
    };
}
/**
 * Check if user is within geofence of the branch.
 */
async function checkGeofence(userLat, userLng, branchCode) {
    const geofence = await getBranchGeofence(branchCode);
    const distance = haversineDistance(userLat, userLng, geofence.lat, geofence.lng);
    return {
        inRange: distance <= geofence.radius,
        distance: Math.round(distance),
        radiusMeters: geofence.radius,
    };
}
/**
 * Validate GPS accuracy.
 */
function isGpsAccuracyValid(accuracy) {
    if (accuracy == null)
        return true; // No accuracy data — allow (trust device)
    return accuracy <= config_1.config.geofence.maxAccuracy;
}
// ─── Leave Labels ────────────────────────────────────────────────────────────
exports.LEAVE_LABELS = {
    VAC: 'ลาพักร้อน',
    SL: 'ลาป่วย',
    PL: 'ลาคลอด',
    ML: 'ลาคลอดบุตร',
    MSL: 'ลาพักเลี้ยงบุตร',
    OL: 'ลางานศพ',
    LOA: 'ลากิจ',
    LWP: 'ลาไม่รับค่าจ้าง',
    STL: 'ลาทำหมัน',
    TR: 'ลาฝึกอบรม',
    CD: 'เปลี่ยนวันหยุด',
};
function getLeaveLabel(type) {
    return exports.LEAVE_LABELS[type] || type;
}
//# sourceMappingURL=employee.js.map