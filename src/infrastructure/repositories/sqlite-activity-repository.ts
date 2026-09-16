import type {
  Activity,
  ActivityRepository,
} from '@/domain/activities/activity';
import type { DataDatabase } from '@/infrastructure/database/data-database';

type ActivityRow = {
  id: string;
  workspace_id: string;
  name: string;
  archived_at: string | null;
  created_at: string;
};

function mapActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

const ACTIVITY_COLUMNS = `id, workspace_id, name, archived_at, created_at`;

export class SqliteActivityRepository implements ActivityRepository {
  constructor(private readonly database: DataDatabase) {}

  async create(activity: Activity): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO activities (id, workspace_id, name, archived_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      activity.id,
      activity.workspaceId,
      activity.name,
      activity.archivedAt,
      activity.createdAt,
    );
  }

  async update(activity: Activity): Promise<void> {
    await this.database.runAsync(
      `UPDATE activities SET name = ? WHERE id = ?`,
      activity.name,
      activity.id,
    );
  }

  async archive(id: string, archivedAt: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE activities SET archived_at = ? WHERE id = ?`,
      archivedAt,
      id,
    );
  }

  async getById(id: string): Promise<Activity | null> {
    const row = await this.database.getFirstAsync<ActivityRow>(
      `SELECT ${ACTIVITY_COLUMNS} FROM activities WHERE id = ?`,
      id,
    );
    return row ? mapActivity(row) : null;
  }

  async listActive(workspaceId: string): Promise<Activity[]> {
    const rows = await this.database.getAllAsync<ActivityRow>(
      `SELECT ${ACTIVITY_COLUMNS}
       FROM activities
       WHERE workspace_id = ? AND archived_at IS NULL
       ORDER BY created_at, id`,
      workspaceId,
    );
    return rows.map(mapActivity);
  }

  async listAll(workspaceId: string): Promise<Activity[]> {
    const rows = await this.database.getAllAsync<ActivityRow>(
      `SELECT ${ACTIVITY_COLUMNS}
       FROM activities
       WHERE workspace_id = ?
       ORDER BY created_at, id`,
      workspaceId,
    );
    return rows.map(mapActivity);
  }
}
