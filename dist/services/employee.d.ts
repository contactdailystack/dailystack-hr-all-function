import type { Employee, GeofenceResult } from '../types';
export declare function getEmployeeByLineId(lineUserId: string): Promise<Employee | null>;
export declare function getEmployeeById(id: string): Promise<Employee | null>;
/**
 * Check if user is within geofence of the branch.
 */
export declare function checkGeofence(userLat: number, userLng: number, branchCode: string | null): Promise<GeofenceResult>;
/**
 * Validate GPS accuracy.
 */
export declare function isGpsAccuracyValid(accuracy: number | null | undefined): boolean;
export declare const LEAVE_LABELS: Record<string, string>;
export declare function getLeaveLabel(type: string): string;
//# sourceMappingURL=employee.d.ts.map