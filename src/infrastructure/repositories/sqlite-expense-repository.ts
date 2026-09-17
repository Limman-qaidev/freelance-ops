import type {
  Expense,
  ExpenseAttachment,
  ExpenseRepository,
  ExpenseStatus,
} from '@/domain/expenses/expense';
import type {
  DataDatabase,
  TransactionalDataDatabase,
} from '@/infrastructure/database/data-database';

interface ExpenseRow {
  id: string;
  project_id: string;
  expense_date: string;
  category: string;
  description: string | null;
  original_amount_minor: number;
  original_currency: string;
  exchange_rate_decimal: string;
  project_amount_minor: number;
  project_currency: string;
  reimbursable: number;
  billable: number;
  status: ExpenseStatus;
  created_at: string;
  updated_at: string;
}

interface AttachmentRow {
  id: string;
  expense_id: string;
  local_uri: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number | null;
  checksum: string | null;
  created_at: string;
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    projectId: row.project_id,
    expenseDate: row.expense_date,
    category: row.category,
    description: row.description,
    originalAmountMinor: row.original_amount_minor,
    originalCurrency: row.original_currency,
    exchangeRateDecimal: row.exchange_rate_decimal,
    projectAmountMinor: row.project_amount_minor,
    projectCurrency: row.project_currency,
    reimbursable: row.reimbursable === 1,
    billable: row.billable === 1,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAttachment(row: AttachmentRow): ExpenseAttachment {
  if (!row.checksum) {
    throw new Error(`Expense attachment ${row.id} has no integrity checksum.`);
  }
  return {
    id: row.id,
    expenseId: row.expense_id,
    localUri: row.local_uri,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    checksum: row.checksum,
    createdAt: row.created_at,
  };
}

async function insertAttachment(
  database: DataDatabase,
  attachment: ExpenseAttachment,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO expense_attachments
      (id, expense_id, local_uri, original_filename, mime_type, file_size_bytes, checksum, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    attachment.id,
    attachment.expenseId,
    attachment.localUri,
    attachment.originalFilename,
    attachment.mimeType,
    attachment.fileSizeBytes,
    attachment.checksum,
    attachment.createdAt,
  );
}

export class SqliteExpenseRepository implements ExpenseRepository {
  constructor(private readonly database: TransactionalDataDatabase) {}

  async create(expense: Expense, attachments: ExpenseAttachment[]): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `INSERT INTO expenses
          (id, project_id, expense_date, category, description,
           original_amount_minor, original_currency, exchange_rate_decimal,
           project_amount_minor, project_currency, reimbursable, billable, status,
           created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        expense.id,
        expense.projectId,
        expense.expenseDate,
        expense.category,
        expense.description,
        expense.originalAmountMinor,
        expense.originalCurrency,
        expense.exchangeRateDecimal,
        expense.projectAmountMinor,
        expense.projectCurrency,
        expense.reimbursable ? 1 : 0,
        expense.billable ? 1 : 0,
        expense.status,
        expense.createdAt,
        expense.updatedAt,
      );
      for (const attachment of attachments) {
        await insertAttachment(transaction, attachment);
      }
    });
  }

  async update(expense: Expense): Promise<void> {
    await this.database.runAsync(
      `UPDATE expenses SET
        project_id = ?, expense_date = ?, category = ?, description = ?,
        original_amount_minor = ?, original_currency = ?, exchange_rate_decimal = ?,
        project_amount_minor = ?, project_currency = ?, reimbursable = ?, billable = ?,
        status = ?, updated_at = ?
       WHERE id = ?`,
      expense.projectId,
      expense.expenseDate,
      expense.category,
      expense.description,
      expense.originalAmountMinor,
      expense.originalCurrency,
      expense.exchangeRateDecimal,
      expense.projectAmountMinor,
      expense.projectCurrency,
      expense.reimbursable ? 1 : 0,
      expense.billable ? 1 : 0,
      expense.status,
      expense.updatedAt,
      expense.id,
    );
  }

  async delete(id: string): Promise<void> {
    await this.database.runAsync('DELETE FROM expenses WHERE id = ?', id);
  }

  async getById(id: string): Promise<Expense | null> {
    const row = await this.database.getFirstAsync<ExpenseRow>(
      'SELECT * FROM expenses WHERE id = ?',
      id,
    );
    return row ? mapExpense(row) : null;
  }

  async listRecent(): Promise<Expense[]> {
    const rows = await this.database.getAllAsync<ExpenseRow>(
      `SELECT * FROM expenses
       ORDER BY expense_date DESC, created_at DESC, id DESC
       LIMIT 200`,
    );
    return rows.map(mapExpense);
  }

  async listByProject(projectId: string): Promise<Expense[]> {
    const rows = await this.database.getAllAsync<ExpenseRow>(
      `SELECT * FROM expenses
       WHERE project_id = ?
       ORDER BY expense_date DESC, created_at DESC, id DESC`,
      projectId,
    );
    return rows.map(mapExpense);
  }

  async listAttachments(expenseId: string): Promise<ExpenseAttachment[]> {
    const rows = await this.database.getAllAsync<AttachmentRow>(
      `SELECT * FROM expense_attachments
       WHERE expense_id = ?
       ORDER BY created_at ASC, id ASC`,
      expenseId,
    );
    return rows.map(mapAttachment);
  }

  async addAttachments(attachments: ExpenseAttachment[]): Promise<void> {
    if (attachments.length === 0) return;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      for (const attachment of attachments) {
        await insertAttachment(transaction, attachment);
      }
    });
  }

  async getAttachmentById(id: string): Promise<ExpenseAttachment | null> {
    const row = await this.database.getFirstAsync<AttachmentRow>(
      'SELECT * FROM expense_attachments WHERE id = ?',
      id,
    );
    return row ? mapAttachment(row) : null;
  }

  async removeAttachment(id: string): Promise<void> {
    await this.database.runAsync('DELETE FROM expense_attachments WHERE id = ?', id);
  }
}
