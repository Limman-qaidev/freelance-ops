import type { Client, ClientRepository } from '@/domain/clients/client';
import type { DataDatabase } from '@/infrastructure/database/data-database';

type ClientRow = {
  id: string;
  workspace_id: string;
  name: string;
  legal_name: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    legalName: row.legal_name,
    notes: row.notes,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const CLIENT_COLUMNS = `
  id, workspace_id, name, legal_name, notes, archived_at, created_at, updated_at
`;

export class SqliteClientRepository implements ClientRepository {
  constructor(private readonly database: DataDatabase) {}

  async create(client: Client): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO clients (
        id, workspace_id, name, legal_name, notes, archived_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      client.id,
      client.workspaceId,
      client.name,
      client.legalName,
      client.notes,
      client.archivedAt,
      client.createdAt,
      client.updatedAt,
    );
  }

  async update(client: Client): Promise<void> {
    await this.database.runAsync(
      `UPDATE clients
       SET name = ?, legal_name = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      client.name,
      client.legalName,
      client.notes,
      client.updatedAt,
      client.id,
    );
  }

  async archive(id: string, archivedAt: string, updatedAt: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE clients SET archived_at = ?, updated_at = ? WHERE id = ?`,
      archivedAt,
      updatedAt,
      id,
    );
  }

  async getById(id: string): Promise<Client | null> {
    const row = await this.database.getFirstAsync<ClientRow>(
      `SELECT ${CLIENT_COLUMNS} FROM clients WHERE id = ?`,
      id,
    );
    return row ? mapClient(row) : null;
  }

  async listActive(workspaceId: string): Promise<Client[]> {
    const rows = await this.database.getAllAsync<ClientRow>(
      `SELECT ${CLIENT_COLUMNS}
       FROM clients
       WHERE workspace_id = ? AND archived_at IS NULL
       ORDER BY name COLLATE NOCASE, id`,
      workspaceId,
    );
    return rows.map(mapClient);
  }
}
