import type {
  QueryExecutor,
  TransactionDatabase,
} from './database-port';
import {
  INITIAL_SCHEMA_SQL,
  INITIAL_SCHEMA_VERSION,
} from './migrations/001-initial-schema';
import {
  TIMER_LIFECYCLE_SCHEMA_VERSION,
  TIMER_LIFECYCLE_SQL,
} from './migrations/002-timer-lifecycle';
import {
  EXPENSE_BILLABLE_SCHEMA_VERSION,
  EXPENSE_BILLABLE_SQL,
} from './migrations/003-expense-billable';

export const DATABASE_VERSION = EXPENSE_BILLABLE_SCHEMA_VERSION;

interface UserVersionRow {
  user_version: number;
}

async function readUserVersion(database: QueryExecutor): Promise<number> {
  const row = await database.getFirstAsync<UserVersionRow>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

export async function migrateDatabase(
  database: TransactionDatabase,
): Promise<void> {
  await database.execAsync('PRAGMA journal_mode = WAL;');
  await database.execAsync('PRAGMA foreign_keys = ON;');

  const currentVersion = await readUserVersion(database);

  if (currentVersion > DATABASE_VERSION) {
    throw new Error(
      `Database version ${currentVersion} is newer than supported version ${DATABASE_VERSION}.`,
    );
  }

  if (currentVersion === DATABASE_VERSION) {
    return;
  }

  await database.withExclusiveTransactionAsync(async (transaction) => {
    let version = currentVersion;

    if (version < INITIAL_SCHEMA_VERSION) {
      await transaction.execAsync(INITIAL_SCHEMA_SQL);
      version = INITIAL_SCHEMA_VERSION;
    }

    if (version < TIMER_LIFECYCLE_SCHEMA_VERSION) {
      await transaction.execAsync(TIMER_LIFECYCLE_SQL);
      version = TIMER_LIFECYCLE_SCHEMA_VERSION;
    }

    if (version < EXPENSE_BILLABLE_SCHEMA_VERSION) {
      await transaction.execAsync(EXPENSE_BILLABLE_SQL);
      version = EXPENSE_BILLABLE_SCHEMA_VERSION;
    }

    await transaction.execAsync(`PRAGMA user_version = ${version};`);
  });

  const migratedVersion = await readUserVersion(database);

  if (migratedVersion !== DATABASE_VERSION) {
    throw new Error(
      `Database migration finished at version ${migratedVersion}; expected ${DATABASE_VERSION}.`,
    );
  }
}
