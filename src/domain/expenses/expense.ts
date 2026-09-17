export const EXPENSE_STATUSES = [
  'PENDING',
  'INCLUDED_IN_CLOSURE',
  'REIMBURSED',
] as const;

export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];
export type ExpenseIntegrityWarning = 'MISSING_ATTACHMENT' | 'CHECKSUM_MISMATCH';

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
  checksum: string | null;
  createdAt: string;
}

export interface ExpenseRecord {
  expense: Expense;
  attachments: ExpenseAttachment[];
  integrityWarnings: ExpenseIntegrityWarning[];
}

export interface StoredExpenseAttachment {
  localUri: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number | null;
  checksum: string | null;
}

export interface PreparedExpenseAttachment extends StoredExpenseAttachment {
  id: string;
  createdAt: string;
}

export interface ExpenseAttachmentStorage {
  pickAndStore(attachmentId: string): Promise<StoredExpenseAttachment | null>;
  exists(localUri: string): Promise<boolean>;
  checksumFor(localUri: string): Promise<string | null>;
  delete(localUri: string): Promise<void>;
}

export interface ExpenseRepository {
  create(expense: Expense, attachment?: ExpenseAttachment): Promise<void>;
  update(expense: Expense): Promise<void>;
  delete(expenseId: string): Promise<void>;
  addAttachment(attachment: ExpenseAttachment): Promise<void>;
  getById(expenseId: string): Promise<{ expense: Expense; attachments: ExpenseAttachment[] } | null>;
  listRecent(limit: number): Promise<Array<{ expense: Expense; attachments: ExpenseAttachment[] }>>;
}
