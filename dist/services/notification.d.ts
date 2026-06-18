import type { PostbackData } from '../types';
interface LineMessage {
    type: 'text' | 'flex';
    text?: string;
    altText?: string;
    contents?: unknown;
}
export declare function pushMessage(userId: string, messages: LineMessage[]): Promise<void>;
export declare function pushText(userId: string, text: string): Promise<void>;
export declare function pushUrgent(userId: string, text: string): Promise<void>;
export declare function replyMessage(replyToken: string, messages: LineMessage[]): Promise<void>;
export declare function replyText(replyToken: string, text: string): Promise<void>;
export declare function notifyManager(message: string, managerLineId: string): Promise<void>;
export declare function notifyManagerUrgent(message: string, managerLineId: string): Promise<void>;
export declare function sendLeaveApprovalFlex(managerLineId: string, employeeName: string, leaveLabel: string, startDate: string, endDate: string | null, note: string | null, postbackData: PostbackData): Promise<void>;
export declare function verifyLineSignature(body: string, signature: string | null): Promise<boolean>;
export {};
//# sourceMappingURL=notification.d.ts.map