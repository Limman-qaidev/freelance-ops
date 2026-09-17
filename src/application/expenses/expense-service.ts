import { calculateExpenseAmounts } from '@/application/expenses/expense-money';
import type {
  Expense,
  ExpenseAttachment,
  ExpenseAttachmentStorage,
  ExpenseRecord,
  ExpenseRepository,
  PreparedExpenseAttachment,
} from '@/domain/expenses/expense';
import type { ProjectRepository } from '@/domain/projects/project';
import { generateUuid } from '@/domain/shared/id';

type IdGenerator = () => string;
type Clock = () => string;

const systemClock: Clock = () => new Date().toISOString();

export type ExpenseMutationInput = {
  projectId: string;
  expenseDate: string;
  category: string;
  description?: string | null;
  originalAmount: string;
  originalCurrency: string;
  exchangeRateDecimal: string | null;
  reimbursable: boolean;
  billable?: boolean;
};

export class ExpenseService {
  constructor(
    private readonly repository: ExpenseRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly attachmentStorage: ExpenseAttachmentStorage,
    private readonly generateId: IdGenerator = generateUuid,
    private readonly now: Clock = systemClock,
  ) {}

  async prepareReceipt(): Promise<PreparedExpenseAttachment | null> {
    const id = this.generateId();
    const stored = await this.attachmentStorage.pickAndStore(id);
    if (!stored) return null;
    return {
      id,
      ...stored,
      createdAt: this.now(),
    };
  }

  async discardPreparedReceipt(receipt: PreparedExpenseAttachment | null): Promise<void> {
    if (!receipt) return;
    await this.attachmentStorage.delete(receipt.localUri);
  }

  async create(
    input: ExpenseMutationInput,
    preparedReceipts?: PreparedExpenseAttachment | PreparedExpenseAttachment[] | null,
  ): Promise<ExpenseRecord> {
    const project = await this.requireProject(input.projectId);
    const timestamp = this.now();
    const amounts = calculateExpenseAmounts({
      originalAmount: input.originalAmount,
      originalCurrency: input.originalCurrency,
      projectCurrency: project.projectCurrency,
      exchangeRateDecimal: input.exchangeRateDecimal,
    });
    const expense: Expense = {
      id: this.generateId(),
      projectId: project.id,
      expenseDate: validateExpenseDate(input.expenseDate),
      category: requireCategory(input.category),
      description: input.description?.trim() || null,
      ...amounts,
      reimbursable: input.reimbursable,
      billable: input.billable ?? false,
      status: 'PENDING',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const prepared = normalizePreparedReceipts(preparedReceipts);
    const attachments = prepared.map((receipt) => bindAttachment(receipt, expense.id));

    try {
      await this.repository.create(expense, attachments);
    } catch (error) {
      await Promise.all(
        prepared.map((receipt) =>
          this.attachmentStorage.delete(receipt.localUri).catch(() => undefined),
        ),
      );
      throw error;
    }

    return this.requireRecord(expense.id);
  }

  async update(expenseId: string, input: ExpenseMutationInput): Promise<ExpenseRecord> {
    const current = await this.requireRawRecord(expenseId);
    if (current.expense.status !== 'PENDING') {
      throw new Error('Closed or reimbursed expenses cannot be edited until their closure state allows it.');
    }
    const project = await this.requireProject(input.projectId);
    const amounts = calculateExpenseAmounts({
      originalAmount: input.originalAmount,
      originalCurrency: input.originalCurrency,
      projectCurrency: project.projectCurrency,
      exchangeRateDecimal: input.exchangeRateDecimal,
    });
    const expense: Expense = {
      ...current.expense,
      projectId: project.id,
      expenseDate: validateExpenseDate(input.expenseDate),
      category: requireCategory(input.category),
      description: input.description?.trim() || null,
      ...amounts,
      reimbursable: input.reimbursable,
      billable: input.billable ?? current.expense.billable,
      updatedAt: this.now(),
    };
    await this.repository.update(expense);
    return this.requireRecord(expenseId);
  }

  async delete(expenseId: string): Promise<void> {
    const current = await this.requireRawRecord(expenseId);
    if (current.expense.status !== 'PENDING') {
      throw new Error('Closed or reimbursed expenses cannot be deleted until their closure state allows it.');
    }
    await this.repository.delete(expenseId);
    await Promise.all(
      current.attachments.map((attachment) =>
        this.attachmentStorage.delete(attachment.localUri).catch(() => undefined),
      ),
    );
  }

  async addPreparedReceipt(
    expenseId: string,
    receipt: PreparedExpenseAttachment,
  ): Promise<ExpenseRecord> {
    const current = await this.requireRawRecord(expenseId);
    if (current.expense.status !== 'PENDING') {
      throw new Error('Closed or reimbursed expenses cannot receive new attachments.');
    }
    const attachment = bindAttachment(receipt, expenseId);
    try {
      await this.repository.addAttachment(attachment);
    } catch (error) {
      await this.attachmentStorage.delete(receipt.localUri).catch(() => undefined);
      throw error;
    }
    return this.requireRecord(expenseId);
  }

  async getById(expenseId: string): Promise<ExpenseRecord | null> {
    const record = await this.repository.getById(expenseId);
    return record ? this.inspectIntegrity(record) : null;
  }

  async listRecent(limit = 100): Promise<ExpenseRecord[]> {
    const records = await this.repository.listRecent(limit);
    return Promise.all(records.map((record) => this.inspectIntegrity(record)));
  }

  private async requireProject(projectId: string) {
    const project = await this.projectRepository.getById(projectId);
    if (!project) throw new Error(`Project ${projectId} was not found.`);
    return project;
  }

  private async requireRawRecord(expenseId: string) {
    const record = await this.repository.getById(expenseId);
    if (!record) throw new Error(`Expense ${expenseId} was not found.`);
    return record;
  }

  private async requireRecord(expenseId: string): Promise<ExpenseRecord> {
    const record = await this.getById(expenseId);
    if (!record) throw new Error(`Expense ${expenseId} was not found after persistence.`);
    return record;
  }

  private async inspectIntegrity(
    record: { expense: Expense; attachments: ExpenseAttachment[] },
  ): Promise<ExpenseRecord> {
    const warnings = new Set<ExpenseRecord['integrityWarnings'][number]>();
    for (const attachment of record.attachments) {
      const exists = await this.attachmentStorage.exists(attachment.localUri);
      if (!exists) {
        warnings.add('MISSING_ATTACHMENT');
        continue;
      }
      if (attachment.checksum) {
        const currentChecksum = await this.attachmentStorage.checksumFor(attachment.localUri);
        if (currentChecksum !== attachment.checksum) {
          warnings.add('CHECKSUM_MISMATCH');
        }
      }
    }
    return {
      ...record,
      integrityWarnings: Array.from(warnings),
    };
  }
}

function normalizePreparedReceipts(
  receipts?: PreparedExpenseAttachment | PreparedExpenseAttachment[] | null,
): PreparedExpenseAttachment[] {
  if (!receipts) return [];
  return Array.isArray(receipts) ? receipts : [receipts];
}

function bindAttachment(
  receipt: PreparedExpenseAttachment,
  expenseId: string,
): ExpenseAttachment {
  return {
    ...receipt,
    expenseId,
  };
}

function requireCategory(value: string): string {
  const category = value.trim();
  if (!category) throw new Error('Expense category is required.');
  return category;
}

function validateExpenseDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Expense date must use YYYY-MM-DD.');
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error('Expense date is not a valid calendar date.');
  }
  return value;
}
