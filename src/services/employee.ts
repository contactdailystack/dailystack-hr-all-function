import {
  findEmployeeByLineId,
  findEmployeeById,
  getMainBranch,
  getBranchByCode,
} from './supabase';
import type { Employee, Branch, GeofenceResult, BranchGeofence } from '../types';
import { config } from '../config';

// ─── Employee Lookup ──────────────────────────────────────────────────────────

export async function getEmployeeByLineId(lineUserId: string): Promise<Employee | null> {
  return findEmployeeByLineId(lineUserId);
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  return findEmployeeById(id);
}

// ─── Geofence ────────────────────────────────────────────────────────────────

/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in meters.
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Get geofence for a branch (from DB or default config).
 */
async function getBranchGeofence(branchCode: string | null): Promise<BranchGeofence> {
  if (branchCode && branchCode !== 'main') {
    const branch = await getBranchByCode(branchCode);
    if (branch && branch.geofence_center_lat && branch.geofence_center_lng) {
      return {
        lat: Number(branch.geofence_center_lat),
        lng: Number(branch.geofence_center_lng),
        radius: branch.geofence_radius_meters,
      };
    }
  }

  // Try main branch from DB first
  const mainBranch = await getMainBranch();
  if (mainBranch && mainBranch.geofence_center_lat && mainBranch.geofence_center_lng) {
    return {
      lat: Number(mainBranch.geofence_center_lat),
      lng: Number(mainBranch.geofence_center_lng),
      radius: mainBranch.geofence_radius_meters,
    };
  }

  // Fallback to config default
  return {
    lat: config.geofence.defaultBranch.lat,
    lng: config.geofence.defaultBranch.lng,
    radius: config.geofence.defaultBranch.radius,
  };
}

/**
 * Check if user is within geofence of the branch.
 */
export async function checkGeofence(
  userLat: number,
  userLng: number,
  branchCode: string | null
): Promise<GeofenceResult> {
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
export function isGpsAccuracyValid(accuracy: number | null | undefined): boolean {
  if (accuracy == null) return true; // No accuracy data — allow (trust device)
  return accuracy <= config.geofence.maxAccuracy;
}

// ─── Leave Labels ────────────────────────────────────────────────────────────

export const LEAVE_LABELS: Record<string, string> = {
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

export function getLeaveLabel(type: string): string {
  return LEAVE_LABELS[type] || type;
}
