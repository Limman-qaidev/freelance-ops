import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type { Expense, ExpenseAttachment } from '@/domain/expenses/expense';
import type { DataDatabase, TransactionalDataDatabase } from '@/infrastructure/database/data-database';
import type { QueryExecutor, TransactionDatabase } from '@/infrastructure/database/database-port';
import { migrateDatabase } from '@/infrastructure/database/migrate-database';
import { SqliteExpenseRepository } from '@/infrastructure/repositories/sqlite-expense-repository';

function migrationDatabase(database: DatabaseSync): TransactionDatabase {
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

function dataDatabase(database: DatabaseSync): TransactionalDataDatabase {
  const executor: DataDatabase = {
    runAsync: async (source, ...params) => {
      database.prepare(source).run(...params);
    },
    getFirstAsync: async <T,>(source: string, ...params: (string | number | null)[]) =>
      (database.prepare(source).get(...params) ?? null) as T | null,
    getAllAsync: async <T,>(source: string, ...params: (string | number | null)[]) =>
      database.prepare(source).all(...params) as T[],
  };
  return {
    ...executor,
    withExclusiveTransactionAsync: async (task) => {
      database.exec('BEGIN EXCLUSIVE;');
      try {
        const result = await task(executor);
        database.exec('COMMIT;');
        return result;
      } catch (error) {
        database.exec('ROLLBACK;');
        throw error;
      }
    },
  };
}

const timestamp = '2026-09-17T09:00:00.000Z';
const projectId = '33333333-3333-4333-8333-333333333333';

async function seedProject(database: TransactionalDataDatabase) {
  await database.runAsync(
    'INSERT INTO workspaces (id, name, default_currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    '11111111-1111-4111-8111-111111111111', 'Freelance Ops', 'EUR', timestamp, timestamp,
  );
  await database.runAsync(
    'INSERT INTO clients (id, workspace_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Synthetic Client', timestamp, timestamp,
  );
  await database.runAsync(
    `INSERT INTO projects
      (id, client_id, name, status, project_currency, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    projectId, '22222222-2222-4222-8222-222222222222', 'Synthetic Project', 'ACTIVE', 'EUR', timestamp, timestamp,
  );
}

describe('SqliteExpenseRepository', () => {
  it('persists an expense and attachment across database reopen', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'freelance-ops-expenses-'));
    const databasePath = join(directory, 'expenses.sqlite');

    const expense: Expense = {
      id: '44444444-4444-4444-8444-444444444444',
      projectId,
      expenseDate: '2026-09-17',
      category: 'Travel',
      description: 'Synthetic taxi',
      originalAmountMinor: 150000,
      originalCurrency: 'MUR',
      exchangeRateDecimal: '0.0205',
      projectAmountMinor: 3075,
      projectCurrency: 'EUR',
      reimbursable: true,
      billable: true,
      status: 'PENDING',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const attachment: ExpenseAttachment = {
      id: '55555555-5555-4555-8555-555555555555',
      expenseId: expense.id,
      localUri: 'file:///documents/receipts/receipt.pdf',
      originalFilename: 'receipt.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 2048,
      checksum: '0123456789abcdef',
      createdAt: timestamp,
    };

    try {
      let database = new DatabaseSync(databasePath);
      await migrateDatabase(migrationDatabase(database));
      let adapter = dataDatabase(database);
      await seedProject(adapter);
      let repository = new SqliteExpenseRepository(adapter);
      await repository.create(expense, [attachment]);
      database.close();

      database = new DatabaseSync(databasePath);
      await migrateDatabase(migrationDatabase(database));
      adapter = dataDatabase(database);
      repository = new SqliteExpenseRepository(adapter);

      expect(await repository.getById(expense.id)).toEqual(expense);
      expect(await repository.listByProject(projectId)).toEqual([expense]);
      expect(await repository.listAttachments(expense.id)).toEqual([attachment]);
      database.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
