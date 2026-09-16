export const PROJECT_STATUSES = [
  'PLANNED',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface Project {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  projectCurrency: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  clientId: string;
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  projectCurrency: string;
}

export interface UpdateProjectInput {
  id: string;
  clientId: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  projectCurrency: string;
}

export interface ProjectRepository {
  create(project: Project): Promise<void>;
  update(project: Project): Promise<void>;
  archive(id: string, archivedAt: string, updatedAt: string): Promise<void>;
  getById(id: string): Promise<Project | null>;
  listActive(workspaceId: string): Promise<Project[]>;
}
