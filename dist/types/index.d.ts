export interface ApiSuccess<T = unknown> {
    success: true;
    message?: string;
    data: T;
}
export interface ApiError {
    success: false;
    message?: string;
    error: string;
}
export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;
export type EmployeeStatus = 'active' | 'inactive' | 'on_leave' | 'resigned' | 'suspended';
export type ShiftType = 'O' | 'Mid' | 'C' | 'Off' | 'CD' | 'OT1' | 'OT2' | 'OT3' | 'OT4' | 'OT5' | 'VAC' | 'SL' | 'LWP' | 'LOA' | 'PL' | 'ML' | 'MSL' | 'OL' | 'STL' | 'TR';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type ClockStatus = 'clocked_in' | 'clocked_out' | 'invalid' | 'manual_override';
export type DepartmentType = 'front_of_house' | 'back_of_house' | 'management' | 'support';
export type PositionType = 'assistant' | 'service' | 'officer' | 'head_chef' | 'kitchen' | 'support' | 'manager';
export type HolidayType = 'H-NY' | 'H-Makha' | 'H-Chakri' | 'H-Songkran13' | 'H-Songkran14' | 'H-Labor' | 'H-Queen' | 'H-King' | 'H-Mother' | 'H-Rama9' | 'H-Piyam' | 'H-Father' | 'H-End';
export interface Employee {
    id: string;
    employee_code: string;
    card_id?: string;
    line_user_id?: string;
    title_th?: string;
    first_name_th?: string;
    last_name_th?: string;
    nickname?: string;
    title_en?: string;
    first_name_en?: string;
    last_name_en?: string;
    full_name_th?: string;
    full_name_en?: string;
    phone?: string;
    email?: string;
    department: DepartmentType;
    position: PositionType;
    branch_id?: string;
    start_date: string;
    end_date?: string;
    status: EmployeeStatus;
    vacation_quota: number;
    sick_leave_quota: number;
    base_salary: number;
    hourly_rate: number;
    ot_rate: number;
    service_charge_eligible: boolean;
    service_charge_share: number;
    social_security_number?: string;
    social_security_contribution: number;
    profile_image_url?: string;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}
export interface Branch {
    id: string;
    code: string;
    name_th: string;
    name_en?: string;
    address?: string;
    phone?: string;
    is_main: boolean;
    geofence_center_lat?: number;
    geofence_center_lng?: number;
    geofence_radius_meters: number;
    working_hours_open: string;
    working_hours_close: string;
    is_active: boolean;
    settings: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
export interface ClockRecord {
    id: string;
    employee_id: string;
    branch_id?: string;
    work_date: string;
    clock_in?: string;
    clock_in_lat?: number;
    clock_in_lng?: number;
    clock_in_accuracy?: number;
    clock_in_geofence_valid?: boolean;
    clock_out?: string;
    clock_out_lat?: number;
    clock_out_lng?: number;
    clock_out_accuracy?: number;
    clock_out_geofence_valid?: boolean;
    total_hours?: number;
    status: ClockStatus;
    notes?: string;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
export interface ScheduleAssignment {
    id: string;
    schedule_id: string;
    employee_id: string;
    shift_date: string;
    day_of_week: number;
    shift_type?: ShiftType;
    is_holiday: boolean;
    holiday_code?: HolidayType;
    is_override: boolean;
    override_reason?: string;
    approved_by?: string;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
export interface LeaveRequest {
    id: string;
    employee_id: string;
    approved_by?: string;
    leave_type: ShiftType;
    start_date: string;
    end_date?: string;
    duration_days: number;
    status: LeaveStatus;
    approved_at?: string;
    rejected_reason?: string;
    has_medical_certificate: boolean;
    certificate_url?: string;
    employee_notes?: string;
    manager_notes?: string;
    line_user_id?: string;
    notified_at?: string;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
export interface PayrollRecord {
    id: string;
    employee_id: string;
    branch_id?: string;
    payroll_month: number;
    payroll_year: number;
    total_work_days: number;
    total_work_hours: number;
    regular_hours: number;
    overtime_hours: number;
    base_salary: number;
    overtime_rate: number;
    overtime_amount: number;
    attendance_bonus: number;
    service_charge_days: number;
    service_charge_share: number;
    unpaid_leave_days: number;
    unpaid_leave_amount: number;
    gross_salary: number;
    social_security: number;
    tax_deduction: number;
    other_deductions: number;
    net_salary: number;
    is_paid: boolean;
    paid_at?: string;
    paid_method?: string;
    notes?: string;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
export interface ClockInPayload {
    lat: number;
    lng: number;
    accuracy?: number;
    branch?: string;
}
export interface ClockOutPayload {
    lat: number;
    lng: number;
    accuracy?: number;
    branch?: string;
}
export interface SubmitLeavePayload {
    type: ShiftType;
    startDate: string;
    endDate?: string;
    note?: string;
}
export interface ClockStatusData {
    clockIn: string | null;
    clockOut: string | null;
    totalHours: number | null;
}
export interface ScheduleDay {
    date: number;
    dayName: string;
    fullDate: string;
    shift: string;
    shiftCode: ShiftType | null;
    isHoliday: boolean;
}
export interface LeaveHistoryItem {
    requestId: string;
    type: ShiftType;
    typeLabel: string;
    startDate: string;
    endDate?: string;
    status: LeaveStatus;
    note: string;
}
export interface PayslipData {
    empId: string;
    empName: string;
    month: string;
    payrollYear: number;
    payrollMonth: number;
    baseSalary: number;
    totalWorkDays?: number;
    totalWorkHours?: number;
    overtimeHours: number;
    overtimeAmount: number;
    attendanceBonus: number;
    unpaidLeaveDays?: number;
    unpaidLeaveAmount?: number;
    serviceChargeShare: number;
    grossSalary: number;
    socialSecurity: number;
    taxDeduction: number;
    otherDeductions: number;
    netSalary: number;
    isPaid: boolean;
    paidAt: string | null;
    note: string | null;
}
export interface ProfileData {
    id: string;
    name: string;
    position: PositionType;
    status: EmployeeStatus;
    lineUserId: string;
}
/**
 * Extended Request with verified LINE user ID
 * (populated by verifyLineToken middleware)
 */
export interface VerifiedRequest {
    verifiedUserId: string;
}
export interface LineWebhookEvent {
    type: string;
    replyToken?: string;
    source?: {
        type: string;
        userId?: string;
        groupId?: string;
        roomId?: string;
    };
    timestamp: number;
    mode?: string;
    message?: {
        type: string;
        id: string;
        text?: string;
    };
    postback?: {
        data: string;
    };
}
export interface PostbackData {
    action: 'approve_leave' | 'reject_leave';
    requestId: string;
    employeeId: string;
    employeeLineId: string;
}
export interface GeofenceResult {
    inRange: boolean;
    distance: number;
    radiusMeters: number;
}
export interface BranchGeofence {
    lat: number;
    lng: number;
    radius: number;
}
//# sourceMappingURL=index.d.ts.map