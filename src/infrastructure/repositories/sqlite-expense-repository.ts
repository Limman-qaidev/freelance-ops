import type {
  Expense,
  ExpenseAttachment,
  ExpenseRepository,
} from '@/domain/expenses/expense';
import type {
  DataDatabase,
  TransactionalDataDatabase,
} from '@/infrastructure/database/data-database';

type ExpenseRow = {
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
  status: Expense['status'];
  created_at: string;
  updated_at: string;
};

type AttachmentRow = {
  id: string;
  expense_id: string;
  local_uri: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number | null;
  checksum: string | null;
  created_at: string;
};

const EXPENSE_COLUMNS = `
  id, project_id, expense_date, category, description,
  original_amount_minor, original_currency, exchange_rate_decimal,
  project_amount_minor, project_currency, reimbursable, status,
  created_at, updated_at
`;

const ATTACHMENT_COLUMNS = `
  id, expense_id, local_uri, original_filename, mime_type,
  file_size_bytes, checksum, created_at
`;

export class SqliteExpenseRepository implements ExpenseRepository {
  constructor(private readonly database: TransactionalDataDatabase) {}

  async create(expense: Expense, attachment?: ExpenseAttachment): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await insertExpense(transaction, expense);
      if (attachment) await insertAttachment(transaction, attachment);
    });
  }

  async update(expense: Expense): Promise<void> {
    await this.database.runAsync(
      `UPDATE expenses
          SET project_id = ?, expense_date = ?, category = ?, description = ?,
              original_amount_minor = ?, original_currency = ?, exchange_rate_decimal = ?,
              project_amount_minor = ?, project_currency = ?, reimbursable = ?, status = ?,
              updated_at = ?
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
      expense.status,
      expense.updatedAt,
      expense.id,
    );
  }

  async delete(expenseId: string): Promise<void> {
    await this.database.runAsync('DELETE FROM expenses WHERE id = ?', expenseId);
  }

  async addAttachment(attachment: ExpenseAttachment): Promise<void> {
    await insertAttachment(this.database, attachment);
  }

  async getById(
    expenseId: string,
  ): Promise<{ expense: Expense; attachments: ExpenseAttachment[] } | null> {
    const row = await this.database.getFirstAsync<ExpenseRow>(
      `SELECT ${EXPENSE_COLUMNS} FROM expenses WHERE id = ?`,
      expenseId,
    );
    if (!row) return null;
    return {
      expense: mapExpense(row),
      attachments: await this.listAttachments(expenseId),
    };
  }

  async listRecent(
    limit: number,
  ): Promise<Array<{ expense: Expense; attachments: ExpenseAttachment[] }>> {
    const safeLimit = Math.max(1, Math.floor(limit));
    const rows = await this.database.getAllAsync<ExpenseRow>(
      `SELECT ${EXPENSE_COLUMNS}
         FROM expenses
        ORDER BY expense_date DESC, created_at DESC
        LIMIT ?`,
      safeLimit,
    );
    return Promise.all(
      rows.map(async (row) => ({
        expense: mapExpense(row),
        attachments: await this.listAttachments(row.id),
      })),
    );
  }

  private async listAttachments(expenseId: string): Promise<ExpenseAttachment[]> {
    const rows = await this.database.getAllAsync<AttachmentRow>(
      `SELECT ${ATTACHMENT_COLUMNS}
         FROM expense_attachments
        WHERE expense_id = ?
        ORDER BY created_at ASC, id ASC`,
      expenseId,
    );
    return rows.map(mapAttachment);
  }
}

async function insertExpense(database: DataDatabase, expense: Expense): Promise<void> {
  await database.runAsync(
    `INSERT INTO expenses (
      id, project_id, expense_date, category, description,
      original_amount_minor, original_currency, exchange_rate_decimal,
      project_amount_minor, project_currency, reimbursable, status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    expense.status,
    expense.createdAt,
    expense.updatedAt,
  );
}

async function insertAttachment(
  database: DataDatabase,
  attachment: ExpenseAttachment,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO expense_attachments (
      id, expense_id, local_uri, original_filename, mime_type,
      file_size_bytes, checksum, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAttachment(row: AttachmentRow): ExpenseAttachment {
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
