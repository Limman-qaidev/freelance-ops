import type {
  Project,
  ProjectRepository,
  ProjectStatus,
} from '@/domain/projects/project';
import type { DataDatabase } from '@/infrastructure/database/data-database';

type ProjectRow = {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  project_currency: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    description: row.description,
    status: row.status,
    plannedStartDate: row.planned_start_date,
    plannedEndDate: row.planned_end_date,
    actualStartDate: row.actual_start_date,
    actualEndDate: row.actual_end_date,
    projectCurrency: row.project_currency,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const PROJECT_COLUMNS = `
  projects.id, projects.client_id, projects.name, projects.description,
  projects.status, projects.planned_start_date, projects.planned_end_date,
  projects.actual_start_date, projects.actual_end_date,
  projects.project_currency, projects.archived_at,
  projects.created_at, projects.updated_at
`;

export class SqliteProjectRepository implements ProjectRepository {
  constructor(private readonly database: DataDatabase) {}

  async create(project: Project): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO projects (
        id, client_id, name, description, status,
        planned_start_date, planned_end_date,
        actual_start_date, actual_end_date,
        project_currency, archived_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      project.id,
      project.clientId,
      project.name,
      project.description,
      project.status,
      project.plannedStartDate,
      project.plannedEndDate,
      project.actualStartDate,
      project.actualEndDate,
      project.projectCurrency,
      project.archivedAt,
      project.createdAt,
      project.updatedAt,
    );
  }

  async update(project: Project): Promise<void> {
    await this.database.runAsync(
      `UPDATE projects
       SET client_id = ?, name = ?, description = ?, status = ?,
           planned_start_date = ?, planned_end_date = ?,
           actual_start_date = ?, actual_end_date = ?,
           project_currency = ?, updated_at = ?
       WHERE id = ?`,
      project.clientId,
      project.name,
      project.description,
      project.status,
      project.plannedStartDate,
      project.plannedEndDate,
      project.actualStartDate,
      project.actualEndDate,
      project.projectCurrency,
      project.updatedAt,
      project.id,
    );
  }

  async archive(id: string, archivedAt: string, updatedAt: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE projects SET archived_at = ?, updated_at = ? WHERE id = ?`,
      archivedAt,
      updatedAt,
      id,
    );
  }

  async getById(id: string): Promise<Project | null> {
    const row = await this.database.getFirstAsync<ProjectRow>(
      `SELECT ${PROJECT_COLUMNS} FROM projects WHERE projects.id = ?`,
      id,
    );
    return row ? mapProject(row) : null;
  }

  async listActive(workspaceId: string): Promise<Project[]> {
    const rows = await this.database.getAllAsync<ProjectRow>(
      `SELECT ${PROJECT_COLUMNS}
       FROM projects
       INNER JOIN clients ON clients.id = projects.client_id
       WHERE clients.workspace_id = ?
         AND clients.archived_at IS NULL
         AND projects.archived_at IS NULL
       ORDER BY projects.name COLLATE NOCASE, projects.id`,
      workspaceId,
    );
    return rows.map(mapProject);
  }
}
