import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type {
  QueryExecutor,
  TransactionDatabase,
} from '../../../src/infrastructure/database/database-port';
import { migrateDatabase } from '../../../src/infrastructure/database/migrate-database';
import { SqliteProjectRepository } from '../../../src/infrastructure/repositories/sqlite-project-repository';

function createMigrationDatabase(database: DatabaseSync): TransactionDatabase {
  const executor: QueryExecutor = {
    execAsync: async (source) => database.exec(source),
    getFirstAsync: async <T,>(source: string) =>
      (database.prepare(source).get() ?? null) as T | null,
  };
  return {
    ...executor,
    withExclusiveTransactionAsync: async (task) => {
      database.exec('BEGIN EXCLUSIVE;');
      try {
        await task(executor);
        database.exec('COMMIT;');
      } catch (error) {
        database.exec('ROLLBACK;');
        throw error;
      }
    },
  };
}

function createDataDatabase(database: DatabaseSync) {
  const createExecutor = () => ({
    runAsync: async (source: string, ...params: (string | number | null)[]) => {
      database.prepare(source).run(...params);
    },
    getFirstAsync: async <T,>(
      source: string,
      ...params: (string | number | null)[]
    ) => (database.prepare(source).get(...params) ?? null) as T | null,
    getAllAsync: async <T,>(
      source: string,
      ...params: (string | number | null)[]
    ) => database.prepare(source).all(...params) as T[],
  });

  return {
    ...createExecutor(),
    withExclusiveTransactionAsync: async <T,>(
      task: (transaction: ReturnType<typeof createExecutor>) => Promise<T>,
    ) => {
      database.exec('BEGIN EXCLUSIVE;');
      try {
        const result = await task(createExecutor());
        database.exec('COMMIT;');
        return result;
      } catch (error) {
        database.exec('ROLLBACK;');
        throw error;
      }
    },
  };
}

const IDS = {
  workspace: '11111111-1111-4111-8111-111111111111',
  client: '22222222-2222-4222-8222-222222222222',
  project: '33333333-3333-4333-8333-333333333333',
};

async function seed(database: ReturnType<typeof createDataDatabase>) {
  const at = '2026-09-17T07:00:00.000Z';
  await database.runAsync(
    'INSERT INTO workspaces (id, name, default_currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    IDS.workspace,
    'Freelance Ops',
    'EUR',
    at,
    at,
  );
  await database.runAsync(
    'INSERT INTO clients (id, workspace_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    IDS.client,
    IDS.workspace,
    'Synthetic Client',
    at,
    at,
  );
  await database.runAsync(
    `INSERT INTO projects (
      id, client_id, name, status, project_currency, created_at, updated_at
    ) VALUES (?, ?, ?, 'ACTIVE', 'EUR', ?, ?)`,
    IDS.project,
    IDS.client,
    'Synthetic Project',
    at,
    at,
  );
}

function idGenerator() {
  let next = 1;
  return () => `66666666-6666-4666-8666-${String(next++).padStart(12, '0')}`;
}

class FakeReceiptStorage {
  present = true;
  checksum = 'md5:receipt';
  deleted: string[] = [];

  async pickAndStore() {
    return {
      localUri: 'file:///app/attachments/receipt.pdf',
      originalFilename: 'receipt.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 321,
      checksum: this.checksum,
    };
  }

  async exists() {
    return this.present;
  }

  async checksumFor() {
    return this.present ? this.checksum : null;
  }

  async delete(localUri: string) {
    this.deleted.push(localUri);
    this.present = false;
  }
}

function loadExpenseTypes() {
  const { SqliteExpenseRepository } = jest.requireActual(
    '../../../src/infrastructure/repositories/sqlite-expense-repository',
  ) as { SqliteExpenseRepository: new (...args: any[]) => any };
  const { ExpenseService } = jest.requireActual(
    '../../../src/application/expenses/expense-service',
  ) as { ExpenseService: new (...args: any[]) => any };
  return { SqliteExpenseRepository, ExpenseService };
}

describe('offline expense service', () => {
  it('persists multicurrency expense and receipt metadata across service reconstruction', async () => {
    const { SqliteExpenseRepository, ExpenseService } = loadExpenseTypes();
    const directory = mkdtempSync(join(tmpdir(), 'freelance-ops-expense-'));
    const path = join(directory, 'expense.sqlite');

    try {
      const sqlite = new DatabaseSync(path);
      await migrateDatabase(createMigrationDatabase(sqlite));
      const database = createDataDatabase(sqlite);
      await seed(database);
      const storage = new FakeReceiptStorage();
      const repository = new SqliteExpenseRepository(database);
      const projects = new SqliteProjectRepository(database);
      const service = new ExpenseService(
        repository,
        projects,
        storage,
        idGenerator(),
        () => '2026-09-17T12:00:00.000Z',
      );

      const receipt = await service.prepareReceipt();
      expect(receipt).not.toBeNull();

      const created = await service.create(
        {
          projectId: IDS.project,
          expenseDate: '2026-09-17',
          category: 'Travel',
          description: 'Synthetic taxi',
          originalAmount: '12.34',
          originalCurrency: 'USD',
          exchangeRateDecimal: '0.9',
          reimbursable: true,
        },
        receipt,
      );

      expect(created.expense).toMatchObject({
        projectId: IDS.project,
        originalAmountMinor: 1234,
        originalCurrency: 'USD',
        exchangeRateDecimal: '0.9',
        projectAmountMinor: 1111,
        projectCurrency: 'EUR',
        reimbursable: true,
        status: 'PENDING',
      });
      expect(created.attachments).toEqual([
        expect.objectContaining({
          localUri: 'file:///app/attachments/receipt.pdf',
          originalFilename: 'receipt.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 321,
          checksum: 'md5:receipt',
        }),
      ]);
      expect(created.integrityWarnings).toEqual([]);

      const reconstructed = new ExpenseService(
        new SqliteExpenseRepository(database),
        new SqliteProjectRepository(database),
        storage,
      );
      expect((await reconstructed.getById(created.expense.id))?.expense).toEqual(created.expense);
      expect(await reconstructed.listRecent()).toHaveLength(1);

      storage.present = false;
      expect((await reconstructed.getById(created.expense.id))?.integrityWarnings).toEqual([
        'MISSING_ATTACHMENT',
      ]);

      sqlite.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects an expense whose project does not exist', async () => {
    const { SqliteExpenseRepository, ExpenseService } = loadExpenseTypes();
    const directory = mkdtempSync(join(tmpdir(), 'freelance-ops-expense-project-'));
    const path = join(directory, 'expense.sqlite');

    try {
      const sqlite = new DatabaseSync(path);
      await migrateDatabase(createMigrationDatabase(sqlite));
      const database = createDataDatabase(sqlite);
      await seed(database);
      const storage = new FakeReceiptStorage();
      const service = new ExpenseService(
        new SqliteExpenseRepository(database),
        new SqliteProjectRepository(database),
        storage,
      );

      await expect(
        service.create({
          projectId: '99999999-9999-4999-8999-999999999999',
          expenseDate: '2026-09-17',
          category: 'Travel',
          description: null,
          originalAmount: '10.00',
          originalCurrency: 'EUR',
          exchangeRateDecimal: null,
          reimbursable: false,
        }),
      ).rejects.toThrow(/project/i);

      sqlite.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
