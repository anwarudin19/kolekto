export const BILLING_QUEUE = 'billing-generate-invoices';
export const REMINDER_QUEUE = 'invoice-reminders';
export const NOTIFICATION_QUEUE = 'notifications';
export const FILE_CLEANUP_QUEUE = 'file-cleanup';

export const BILLING_JOB_GENERATE_MONTHLY = 'billing.generate-monthly-invoices';
export const REMINDER_JOB_PROCESS = 'reminder.process-invoices';
export const NOTIFICATION_JOB_CREATE = 'notification.create';
export const FILE_CLEANUP_JOB_DELETE = 'file-cleanup.delete-object';

export const CACHE_TTL = {
  ACCOUNT_BALANCE: 60,
  UNREAD_NOTIFICATION_COUNT: 30,
  DASHBOARD_SUMMARY: 60,
} as const;

export const cacheKeys = {
  accountBalance: (teamId: string, accountId: string) => `cache:account-balance:${teamId}:${accountId}`,
  unreadNotificationCount: (userId: string) => `cache:notifications:unread:${userId}`,
  dashboardSummary: (teamId: string, userId: string) => `cache:dashboard:${teamId}:${userId}`,
  loginAttempt: (email: string, ip: string) => `rate:login:${email}:${ip}`,
};
