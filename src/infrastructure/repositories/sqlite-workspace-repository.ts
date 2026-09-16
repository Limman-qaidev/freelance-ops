import type { Workspace, WorkspaceRepository } from '@/domain/shared/workspace';
import type { DataDatabase } from '@/infrastructure/database/data-database';

type WorkspaceRow = {
  id: string;
  name: string;
  default_currency: string;
  created_at: string;
  updated_at: string;
};

function mapWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    defaultCurrency: row.default_currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly database: DataDatabase) {}

  async create(workspace: Workspace): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO workspaces (id, name, default_currency, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      workspace.id,
      workspace.name,
      workspace.defaultCurrency,
      workspace.createdAt,
      workspace.updatedAt,
    );
  }

  async getFirst(): Promise<Workspace | null> {
    const row = await this.database.getFirstAsync<WorkspaceRow>(
      `SELECT id, name, default_currency, created_at, updated_at
       FROM workspaces
       ORDER BY created_at, id
       LIMIT 1`,
    );

    return row ? mapWorkspace(row) : null;
  }
}
