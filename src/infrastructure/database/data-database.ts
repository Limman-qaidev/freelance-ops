export type DatabaseValue = string | number | null;

export interface DataDatabase {
  runAsync(source: string, ...params: DatabaseValue[]): Promise<void>;
  getFirstAsync<T>(source: string, ...params: DatabaseValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: DatabaseValue[]): Promise<T[]>;
}

export interface TransactionalDataDatabase extends DataDatabase {
  withExclusiveTransactionAsync<T>(
    task: (transaction: DataDatabase) => Promise<T>,
  ): Promise<T>;
}
