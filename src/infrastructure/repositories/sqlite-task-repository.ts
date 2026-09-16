import type { DataDatabase } from '@/infrastructure/database/data-database';
import type { Task, TaskRepository, TaskStatus } from '@/domain/tasks/task';

type TaskRow = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  priority: string | null;
  estimated_minutes: number | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description,
    status: row.status,
    priority: row.priority,
    estimatedMinutes: row.estimated_minutes,
    plannedStartDate: row.planned_start_date,
    plannedEndDate: row.planned_end_date,
    actualStartDate: row.actual_start_date,
    actualEndDate: row.actual_end_date,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const TASK_COLUMNS = `
  id, project_id, name, description, status, priority, estimated_minutes,
  planned_start_date, planned_end_date, actual_start_date, actual_end_date,
  archived_at, created_at, updated_at
`;

export class SqliteTaskRepository implements TaskRepository {
  constructor(private readonly database: DataDatabase) {}

  async create(task: Task): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO tasks (
        id, project_id, name, description, status, priority, estimated_minutes,
        planned_start_date, planned_end_date, actual_start_date, actual_end_date,
        archived_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      task.id,
      task.projectId,
      task.name,
      task.description,
      task.status,
      task.priority,
      task.estimatedMinutes,
      task.plannedStartDate,
      task.plannedEndDate,
      task.actualStartDate,
      task.actualEndDate,
      task.archivedAt,
      task.createdAt,
      task.updatedAt,
    );
  }

  async update(task: Task): Promise<void> {
    await this.database.runAsync(
      `UPDATE tasks
       SET project_id = ?, name = ?, description = ?, status = ?, priority = ?,
           estimated_minutes = ?, planned_start_date = ?, planned_end_date = ?,
           actual_start_date = ?, actual_end_date = ?, updated_at = ?
       WHERE id = ?`,
      task.projectId,
      task.name,
      task.description,
      task.status,
      task.priority,
      task.estimatedMinutes,
      task.plannedStartDate,
      task.plannedEndDate,
      task.actualStartDate,
      task.actualEndDate,
      task.updatedAt,
      task.id,
    );
  }

  async archive(id: string, archivedAt: string, updatedAt: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE tasks SET archived_at = ?, updated_at = ? WHERE id = ?`,
      archivedAt,
      updatedAt,
      id,
    );
  }

  async getById(id: string): Promise<Task | null> {
    const row = await this.database.getFirstAsync<TaskRow>(
      `SELECT ${TASK_COLUMNS} FROM tasks WHERE id = ?`,
      id,
    );
    return row ? mapTask(row) : null;
  }

  async listForProject(projectId: string): Promise<Task[]> {
    const rows = await this.database.getAllAsync<TaskRow>(
      `SELECT ${TASK_COLUMNS}
       FROM tasks
       WHERE project_id = ? AND archived_at IS NULL
       ORDER BY name COLLATE NOCASE, id`,
      projectId,
    );
    return rows.map(mapTask);
  }
}
