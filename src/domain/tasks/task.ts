export const TASK_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  priority: string | null;
  estimatedMinutes: number | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  projectId: string;
  name: string;
  description?: string | null;
  priority?: string | null;
  estimatedMinutes?: number | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
}

export interface UpdateTaskInput {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  status: TaskStatus;
  priority?: string | null;
  estimatedMinutes?: number | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
}

export interface TaskRepository {
  create(task: Task): Promise<void>;
  update(task: Task): Promise<void>;
  archive(id: string, archivedAt: string, updatedAt: string): Promise<void>;
  getById(id: string): Promise<Task | null>;
  listForProject(projectId: string): Promise<Task[]>;
}
