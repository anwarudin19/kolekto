export interface NotificationJobPayload {
  userId: string;
  teamId?: string | null;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
}
