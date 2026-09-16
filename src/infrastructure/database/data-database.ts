export type DatabaseValue = string | number | null;

export interface DataDatabase {
  runAsync(source: string, ...params: DatabaseValue[]): Promise<void>;
  getFirstAsync<T>(source: string, ...params: DatabaseValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: DatabaseValue[]): Promise<T[]>;
}
