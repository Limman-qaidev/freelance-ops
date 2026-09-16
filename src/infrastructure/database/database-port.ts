export interface QueryExecutor {
  execAsync(source: string): Promise<void>;
  getFirstAsync<T>(source: string): Promise<T | null>;
}

export interface TransactionDatabase extends QueryExecutor {
  withExclusiveTransactionAsync(
    task: (transaction: QueryExecutor) => Promise<void>,
  ): Promise<void>;
}

export async function withExclusiveWrite<T>(
  database: TransactionDatabase,
  task: (transaction: QueryExecutor) => Promise<T>,
): Promise<T> {
  let result: T | undefined;
  let completed = false;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    result = await task(transaction);
    completed = true;
  });

  if (!completed) {
    throw new Error('Exclusive database write did not complete.');
  }

  return result as T;
}
