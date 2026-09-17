import { ExpenseService } from '@/application/expenses/expense-service';
import type {
  AttachmentFileStore,
  AttachmentIntegrity,
  AttachmentSource,
  Expense,
  ExpenseAttachment,
  ExpenseRepository,
  StoredAttachmentFile,
} from '@/domain/expenses/expense';
import type { Project, ProjectRepository } from '@/domain/projects/project';

const project: Project = {
  id: 'project-1',
  clientId: 'client-1',
  name: 'Synthetic project',
  description: null,
  status: 'ACTIVE',
  plannedStartDate: null,
  plannedEndDate: null,
  actualStartDate: null,
  actualEndDate: null,
  projectCurrency: 'EUR',
  archivedAt: null,
  createdAt: '2026-09-17T08:00:00.000Z',
  updatedAt: '2026-09-17T08:00:00.000Z',
};

class MemoryExpenseRepository implements ExpenseRepository {
  expenses = new Map<string, Expense>();
  attachments = new Map<string, ExpenseAttachment>();

  async create(expense: Expense, attachments: ExpenseAttachment[]): Promise<void> {
    this.expenses.set(expense.id, expense);
    for (const attachment of attachments) this.attachments.set(attachment.id, attachment);
  }

  async update(expense: Expense): Promise<void> {
    this.expenses.set(expense.id, expense);
  }

  async delete(id: string): Promise<void> {
    this.expenses.delete(id);
    for (const [attachmentId, attachment] of this.attachments) {
      if (attachment.expenseId === id) this.attachments.delete(attachmentId);
    }
  }

  async getById(id: string): Promise<Expense | null> {
    return this.expenses.get(id) ?? null;
  }

  async listRecent(): Promise<Expense[]> {
    return [...this.expenses.values()];
  }

  async listByProject(projectId: string): Promise<Expense[]> {
    return [...this.expenses.values()].filter((expense) => expense.projectId === projectId);
  }

  async listAttachments(expenseId: string): Promise<ExpenseAttachment[]> {
    return [...this.attachments.values()].filter(
      (attachment) => attachment.expenseId === expenseId,
    );
  }

  async addAttachments(attachments: ExpenseAttachment[]): Promise<void> {
    for (const attachment of attachments) this.attachments.set(attachment.id, attachment);
  }

  async getAttachmentById(id: string): Promise<ExpenseAttachment | null> {
    return this.attachments.get(id) ?? null;
  }

  async removeAttachment(id: string): Promise<void> {
    this.attachments.delete(id);
  }
}

class MemoryAttachmentFileStore implements AttachmentFileStore {
  integrity: AttachmentIntegrity = 'OK';
  deleted: string[] = [];

  async pick(): Promise<AttachmentSource[]> {
    return [];
  }

  async persist(source: AttachmentSource, storageKey: string): Promise<StoredAttachmentFile> {
    return {
      localUri: `file:///receipts/${storageKey}-${source.originalFilename}`,
      originalFilename: source.originalFilename,
      mimeType: source.mimeType,
      fileSizeBytes: source.fileSizeBytes,
      checksum: `checksum-${storageKey}`,
    };
  }

  async inspect(): Promise<AttachmentIntegrity> {
    return this.integrity;
  }

  async delete(localUri: string): Promise<void> {
    this.deleted.push(localUri);
  }
}

function projectRepository(existing: Project | null = project): ProjectRepository {
  return {
    create: async () => undefined,
    update: async () => undefined,
    archive: async () => undefined,
    getById: async (id) => (existing?.id === id ? existing : null),
    listActive: async () => (existing ? [existing] : []),
  };
}

function createService(existingProject: Project | null = project) {
  const repository = new MemoryExpenseRepository();
  const files = new MemoryAttachmentFileStore();
  const ids = ['expense-1', 'attachment-1', 'expense-2', 'attachment-2'];
  const service = new ExpenseService(
    repository,
    projectRepository(existingProject),
    files,
    () => ids.shift() ?? 'generated-id',
    () => '2026-09-17T09:00:00.000Z',
  );
  return { service, repository, files };
}

const receipt: AttachmentSource = {
  uri: 'file:///picker/receipt.pdf',
  originalFilename: 'receipt.pdf',
  mimeType: 'application/pdf',
  fileSizeBytes: 1234,
};

describe('ExpenseService', () => {
  it('creates same-currency expenses using integer minor units and billable/reimbursable independently', async () => {
    const { service, repository } = createService();

    const expense = await service.create({
      projectId: project.id,
      expenseDate: '2026-09-17',
      category: 'Transport',
      description: 'Synthetic taxi',
      originalAmount: '28.43',
      originalCurrency: 'EUR',
      reimbursable: false,
      billable: true,
      attachments: [receipt],
    });

    expect(expense).toEqual(
      expect.objectContaining({
        originalAmountMinor: 2843,
        originalCurrency: 'EUR',
        exchangeRateDecimal: '1',
        projectAmountMinor: 2843,
        projectCurrency: 'EUR',
        reimbursable: false,
        billable: true,
        status: 'PENDING',
      }),
    );
    expect(await repository.listAttachments(expense.id)).toEqual([
      expect.objectContaining({
        originalFilename: 'receipt.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1234,
        checksum: 'checksum-attachment-1',
      }),
    ]);
  });

  it('requires an existing project and derives the project currency from it', async () => {
    const { service } = createService(null);

    await expect(
      service.create({
        projectId: 'missing-project',
        expenseDate: '2026-09-17',
        category: 'Travel',
        originalAmount: '10.00',
        originalCurrency: 'EUR',
        reimbursable: true,
        billable: true,
      }),
    ).rejects.toThrow(/project/i);
  });

  it('persists a decimal-string FX rate and derives the converted project amount exactly', async () => {
    const { service } = createService();

    const expense = await service.create({
      projectId: project.id,
      expenseDate: '2026-09-17',
      category: 'Travel',
      originalAmount: '1500.00',
      originalCurrency: 'MUR',
      exchangeRateDecimal: '0.0205',
      reimbursable: true,
      billable: true,
    });

    expect(expense.originalAmountMinor).toBe(150000);
    expect(expense.exchangeRateDecimal).toBe('0.0205');
    expect(expense.projectAmountMinor).toBe(3075);
    expect(expense.projectCurrency).toBe('EUR');
  });

  it('surfaces a recoverable integrity state when an attachment file is missing', async () => {
    const { service, files } = createService();
    const expense = await service.create({
      projectId: project.id,
      expenseDate: '2026-09-17',
      category: 'Accommodation',
      originalAmount: '90.00',
      originalCurrency: 'EUR',
      reimbursable: true,
      billable: true,
      attachments: [receipt],
    });

    files.integrity = 'MISSING';
    const details = await service.getDetails(expense.id);

    expect(details?.attachments[0]).toEqual(
      expect.objectContaining({ integrity: 'MISSING' }),
    );
  });
});
