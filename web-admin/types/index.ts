// ─── Auth ─────────────────────────────────────────────────────────────────────
export type Role = 'SUPER_ADMIN' | 'OWNER' | 'ADMIN' | 'TREASURER' | 'MEMBER';
export type UserStatus = 'ACTIVE' | 'DISABLED' | 'PENDING';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  activeTeamId?: string | null;
  role: Role;
  status: UserStatus;
  isSuperAdmin?: boolean;
  createdAt?: string;
  updatedAt?: string;
  ownedTeams?: Array<{ id: string; name: string; status: string }>;
  teamMembers?: Array<{ id: string; teamId: string; memberName: string; systemRole: string; status: string }>;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

// ─── API ──────────────────────────────────────────────────────────────────────
export type ApiErrorShape = {
  status?: number;
  message: string;
  fields?: Record<string, string[]>;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  totalAmount?: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

// ─── Team ─────────────────────────────────────────────────────────────────────
export type Team = {
  id: string;
  name: string;
  description?: string | null;
  inviteCode: string;
  defaultInvoiceDueDay: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  userRole?: Role;
};

export type TeamMember = {
  id: string;
  teamId: string;
  userId: string;
  memberName: string;
  phoneNumber?: string | null;
  systemRole: Role;
  status: 'ACTIVE' | 'INVITED' | 'INACTIVE' | 'LEFT' | 'BANNED';
  joinedAt?: string;
  createdAt: string;
  user?: { email: string; fullName: string };
  role?: TeamRole;
  arrears?: number;
  paidThisPeriod?: boolean;
};

export type TeamRole = {
  id: string;
  teamId: string;
  name: string;
  feeAmount: number;
  periodType: 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  invoiceDueDay: number;
  memberCount?: number;
};

// ─── Invoice ──────────────────────────────────────────────────────────────────
export type InvoiceStatus = 'DRAFT' | 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type Invoice = {
  id: string;
  code: string;
  teamId: string;
  userId: string;
  roleId: string;
  periodDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: InvoiceStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  member?: TeamMember;
  role?: TeamRole;
  payments?: ContributionPayment[];
};

// ─── Payment ──────────────────────────────────────────────────────────────────
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ContributionPayment = {
  id: string;
  invoiceId: string;
  userId: string;
  accountId: string;
  amount: number;
  proofUrl?: string | null;
  status: PaymentStatus;
  notes?: string | null;
  approvedById?: string | null;
  rejectedById?: string | null;
  createdAt: string;
  updatedAt: string;
  invoice?: Invoice;
  account?: Account;
  submittedBy?: { fullName: string; email: string };
};

// ─── Account ──────────────────────────────────────────────────────────────────
export type AccountType = 'CASH' | 'BANK' | 'EWALLET';

export type Account = {
  id: string;
  teamId: string;
  name: string;
  type: AccountType;
  bankName?: string | null;
  accountNumber?: string | null;
  balance?: number;
  isActive: boolean;
  createdAt: string;
};

// ─── Transaction ──────────────────────────────────────────────────────────────
export type TransactionType = 'INCOME' | 'EXPENSE';
export type TransactionSource = 'CONTRIBUTION' | 'DONATION' | 'MANUAL_INCOME' | 'MANUAL_EXPENSE';

export type Transaction = {
  id: string;
  teamId: string;
  accountId: string;
  categoryId?: string | null;
  type: TransactionType;
  source: TransactionSource;
  amount: number;
  description?: string | null;
  proofUrls?: string[];
  createdById: string;
  createdAt: string;
  account?: Account;
  category?: { id: string; name: string; color?: string };
  createdBy?: { fullName: string };
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export type DashboardStats = {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  activeMembers: number;
  totalMembers: number;
  paidInvoices: number;
  partialInvoices: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  pendingApprovals: number;
  monthlyTrend: { label: string; pemasukan: number; pengeluaran: number }[];
};

// ─── Email templates ────────────────────────────────────────────────────────
export type EmailTemplateType =
  | 'RESET_PASSWORD'
  | 'VERIFY_EMAIL'
  | 'INVOICE_REMINDER'
  | 'PAYMENT_CONFIRMED'
  | 'TEAM_INVITATION'
  | 'LICENSE_EXPIRING';

export type EmailTemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type EmailLogStatus = 'PENDING' | 'SENT' | 'FAILED';

export type EmailTemplate = {
  id: string;
  type: EmailTemplateType;
  name: string;
  subject: string;
  htmlBody: string;
  textBody?: string | null;
  status: EmailTemplateStatus;
  version: number;
  isActive: boolean;
  requiredVariables: string[];
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmailLog = {
  id: string;
  to: string;
  subject: string;
  type: EmailTemplateType;
  templateId?: string | null;
  templateVersion?: number | null;
  status: EmailLogStatus;
  provider: string;
  messageId?: string | null;
  error?: string | null;
  createdAt: string;
};

export type EmailTemplatePreview = {
  template: EmailTemplate;
  subject: string;
  htmlBody: string;
  textBody?: string | null;
  templateId?: string | null;
  templateVersion?: number | null;
  type: EmailTemplateType;
  context: Record<string, unknown>;
  source: 'database' | 'fallback' | 'override';
  missingVariables: string[];
};
