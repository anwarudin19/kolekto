export interface GenerateMonthlyInvoicesJobPayload {
  periodDateMs?: number;
  teamId?: string;
  actorId?: string;
  source?: 'scheduler' | 'manual';
}
