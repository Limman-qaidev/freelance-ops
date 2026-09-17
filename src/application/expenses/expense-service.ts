import type {
  AttachmentFileStore,
  AttachmentSource,
  CreateExpenseInput,
  Expense,
  ExpenseAttachment,
  ExpenseDetails,
  ExpenseRepository,
  UpdateExpenseInput,
} from '@/domain/expenses/expense';
import {
  convertMinorUnitsByDecimalRate,
  normalizeDecimalRate,
  parseAmountToMinorUnits,
} from '@/domain/expenses/money';
import type { Project, ProjectRepository } from '@/domain/projects/project';
import { generateUuid } from '@/domain/shared/id';

type IdGenerator = () => string;
type Clock = () => string;

const systemClock: Clock = () => new Date().toISOString();

function normalizeCurrency(value: string): string {
  const currency = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error('Currency must be a three-letter code.');
  }
  return currency;
}

function validateDate(value: string): string {
  const date = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Expense date must use YYYY-MM-DD.');
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error('Expense date is invalid.');
  }
  return date;
}

export class ExpenseService {
  constructor(
    private readonly repository: ExpenseRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly files: AttachmentFileStore,
    private readonly generateId: IdGenerator = generateUuid,
    private readonly now: Clock = systemClock,
  ) {}

  async create(input: CreateExpenseInput): Promise<Expense> {
    const project = await this.requireProject(input.projectId);
    const timestamp = this.now();
    const expense = this.buildExpense(this.generateId(), input, project, timestamp, timestamp);
    const attachments = await this.persistAttachments(
      expense.id,
      input.attachments ?? [],
      timestamp,
    );

    try {
      await this.repository.create(expense, attachments);
      return expense;
    } catch (error) {
      await this.cleanupFiles(attachments);
      throw error;
    }
  }

  async update(input: UpdateExpenseInput): Promise<Expense> {
    const current = await this.requireExpense(input.id);
    this.assertEditable(current);
    const project = await this.requireProject(input.projectId);
    const updated = this.buildExpense(
      current.id,
      input,
      project,
      current.createdAt,
      this.now(),
      current.status,
    );
    await this.repository.update(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const expense = await this.requireExpense(id);
    this.assertEditable(expense);
    const attachments = await this.repository.listAttachments(id);
    await this.repository.delete(id);
    await this.cleanupFiles(attachments);
  }

  getById(id: string): Promise<Expense | null> {
    return this.repository.getById(id);
  }

  listRecent(): Promise<Expense[]> {
    return this.repository.listRecent();
  }

  listByProject(projectId: string): Promise<Expense[]> {
    return this.repository.listByProject(projectId);
  }

  pickAttachments(): Promise<AttachmentSource[]> {
    return this.files.pick();
  }

  async addAttachments(expenseId: string, sources: AttachmentSource[]): Promise<void> {
    const expense = await this.requireExpense(expenseId);
    this.assertEditable(expense);
    const attachments = await this.persistAttachments(expenseId, sources, this.now());
    try {
      await this.repository.addAttachments(attachments);
    } catch (error) {
      await this.cleanupFiles(attachments);
      throw error;
    }
  }

  async removeAttachment(id: string): Promise<void> {
    const attachment = await this.repository.getAttachmentById(id);
    if (!attachment) throw new Error(`Attachment ${id} was not found.`);
    const expense = await this.requireExpense(attachment.expenseId);
    this.assertEditable(expense);
    await this.repository.removeAttachment(id);
    await this.safeDeleteFile(attachment.localUri);
  }

  async getDetails(id: string): Promise<ExpenseDetails | null> {
    const expense = await this.repository.getById(id);
    if (!expense) return null;
    const attachments = await this.repository.listAttachments(id);
    return {
      expense,
      attachments: await Promise.all(
        attachments.map(async (attachment) => ({
          ...attachment,
          integrity: await this.files.inspect(
            attachment.localUri,
            attachment.checksum,
          ),
        })),
      ),
    };
  }

  private buildExpense(
    id: string,
    input: Omit<CreateExpenseInput, 'attachments'>,
    project: Project,
    createdAt: string,
    updatedAt: string,
    status: Expense['status'] = 'PENDING',
  ): Expense {
    const category = input.category.trim();
    if (!category) throw new Error('Expense category is required.');

    const originalCurrency = normalizeCurrency(input.originalCurrency);
    const projectCurrency = normalizeCurrency(project.projectCurrency);
    const originalAmountMinor = parseAmountToMinorUnits(input.originalAmount);
    const exchangeRateDecimal =
      originalCurrency === projectCurrency
        ? '1'
        : normalizeDecimalRate(input.exchangeRateDecimal ?? '');
    const projectAmountMinor =
      originalCurrency === projectCurrency
        ? originalAmountMinor
        : convertMinorUnitsByDecimalRate(originalAmountMinor, exchangeRateDecimal);

    return {
      id,
      projectId: project.id,
      expenseDate: validateDate(input.expenseDate),
      category,
      description: input.description?.trim() || null,
      originalAmountMinor,
      originalCurrency,
      exchangeRateDecimal,
      projectAmountMinor,
      projectCurrency,
      reimbursable: input.reimbursable,
      billable: input.billable,
      status,
      createdAt,
      updatedAt,
    };
  }

  private async persistAttachments(
    expenseId: string,
    sources: AttachmentSource[],
    createdAt: string,
  ): Promise<ExpenseAttachment[]> {
    const attachments: ExpenseAttachment[] = [];
    try {
      for (const source of sources) {
        const attachmentId = this.generateId();
        const stored = await this.files.persist(source, attachmentId);
        attachments.push({
          id: attachmentId,
          expenseId,
          localUri: stored.localUri,
          originalFilename: stored.originalFilename,
          mimeType: stored.mimeType,
          fileSizeBytes: stored.fileSizeBytes,
          checksum: stored.checksum,
          createdAt,
        });
      }
      return attachments;
    } catch (error) {
      await this.cleanupFiles(attachments);
      throw error;
    }
  }

  private async cleanupFiles(attachments: ExpenseAttachment[]): Promise<void> {
    await Promise.all(attachments.map((attachment) => this.safeDeleteFile(attachment.localUri)));
  }

  private async safeDeleteFile(localUri: string): Promise<void> {
    try {
      await this.files.delete(localUri);
    } catch {
      // An orphan local file is safer than restoring a database reference to a failed delete.
    }
  }

  private async requireProject(id: string): Promise<Project> {
    const project = await this.projectRepository.getById(id);
    if (!project) throw new Error(`Project ${id} was not found.`);
    return project;
  }

  private async requireExpense(id: string): Promise<Expense> {
    const expense = await this.repository.getById(id);
    if (!expense) throw new Error(`Expense ${id} was not found.`);
    return expense;
  }

  private assertEditable(expense: Expense): void {
    if (expense.status === 'INCLUDED_IN_CLOSURE') {
      throw new Error('Expense is included in a billing closure and cannot be changed.');
    }
  }
}
