export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    webUrl: process.env.APP_WEB_URL?.trim() || undefined,
    frontendUrl: process.env.APP_FRONTEND_URL?.trim() || process.env.APP_WEB_URL?.trim() || undefined,
    billingEodCron: process.env.BILLING_EOD_CRON?.trim() || '55 23 * * *',
    invoiceReminderCron: process.env.INVOICE_REMINDER_CRON?.trim() || '0 8 * * *',
    holidayApiBaseUrl: process.env.HOLIDAY_API_BASE_URL?.trim() || 'https://date.nager.at/api/v3',
    holidayApiCountryCode: process.env.HOLIDAY_API_COUNTRY_CODE?.trim().toUpperCase() || 'ID',
  },
});
