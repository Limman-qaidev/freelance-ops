export const EXPENSE_STATUSES = [
  'PENDING',
  'INCLUDED_IN_CLOSURE',
  'REIMBURSED',
] as const;

export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export interface Expense {
  id: string;
  projectId: string;
  expenseDate: string;
  category: string;
  description: string | null;
  originalAmountMinor: number;
  originalCurrency: string;
  exchangeRateDecimal: string;
  projectAmountMinor: number;
  projectCurrency: string;
  reimbursable: boolean;
  billable: boolean;
  status: ExpenseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseAttachment {
  id: string;
  expenseId: string;
  localUri: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number | null;
  checksum: string;
  createdAt: string;
}

export type AttachmentIntegrity = 'OK' | 'MISSING' | 'CHANGED';

export interface ExpenseAttachmentWithIntegrity extends ExpenseAttachment {
  integrity: AttachmentIntegrity;
}

export interface ExpenseDetails {
  expense: Expense;
  attachments: ExpenseAttachmentWithIntegrity[];
}

export interface AttachmentSource {
  uri: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number | null;
}

export interface StoredAttachmentFile {
  localUri: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number | null;
  checksum: string;
}

export interface AttachmentFileStore {
  pick(): Promise<AttachmentSource[]>;
  persist(source: AttachmentSource, storageKey: string): Promise<StoredAttachmentFile>;
  inspect(localUri: string, expectedChecksum: string): Promise<AttachmentIntegrity>;
  delete(localUri: string): Promise<void>;
}

export interface ExpenseRepository {
  create(expense: Expense, attachments: ExpenseAttachment[]): Promise<void>;
  update(expense: Expense): Promise<void>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Expense | null>;
  listRecent(): Promise<Expense[]>;
  listByProject(projectId: string): Promise<Expense[]>;
  listAttachments(expenseId: string): Promise<ExpenseAttachment[]>;
  addAttachments(attachments: ExpenseAttachment[]): Promise<void>;
  getAttachmentById(id: string): Promise<ExpenseAttachment | null>;
  removeAttachment(id: string): Promise<void>;
}

export interface CreateExpenseInput {
  projectId: string;
  expenseDate: string;
  category: string;
  description?: string | null;
  originalAmount: string;
  originalCurrency: string;
  exchangeRateDecimal?: string | null;
  reimbursable: boolean;
  billable: boolean;
  attachments?: AttachmentSource[];
}

export interface UpdateExpenseInput extends Omit<CreateExpenseInput, 'attachments'> {
  id: string;
}
