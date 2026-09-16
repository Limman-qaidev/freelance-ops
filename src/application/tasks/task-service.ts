import { generateUuid } from '@/domain/shared/id';
import {
  type CreateTaskInput,
  type Task,
  type TaskRepository,
  type UpdateTaskInput,
} from '@/domain/tasks/task';

type IdGenerator = () => string;
type Clock = () => string;

const systemClock: Clock = () => new Date().toISOString();

export class TaskService {
  constructor(
    private readonly repository: TaskRepository,
    private readonly generateId: IdGenerator = generateUuid,
    private readonly now: Clock = systemClock,
  ) {}

  async create(input: CreateTaskInput): Promise<Task> {
    const timestamp = this.now();
    const task: Task = {
      id: this.generateId(),
      projectId: input.projectId,
      name: input.name,
      description: input.description ?? null,
      status: 'PENDING',
      priority: input.priority ?? null,
      estimatedMinutes: input.estimatedMinutes ?? null,
      plannedStartDate: input.plannedStartDate ?? null,
      plannedEndDate: input.plannedEndDate ?? null,
      actualStartDate: null,
      actualEndDate: null,
      archivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.repository.create(task);
    return task;
  }

  async update(input: UpdateTaskInput): Promise<Task> {
    const current = await this.requireTask(input.id);
    const updated: Task = {
      ...current,
      projectId: input.projectId,
      name: input.name,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority ?? null,
      estimatedMinutes: input.estimatedMinutes ?? null,
      plannedStartDate: input.plannedStartDate ?? null,
      plannedEndDate: input.plannedEndDate ?? null,
      actualStartDate: input.actualStartDate ?? null,
      actualEndDate: input.actualEndDate ?? null,
      updatedAt: this.now(),
    };

    await this.repository.update(updated);
    return updated;
  }

  async archive(id: string): Promise<void> {
    await this.requireTask(id);
    const timestamp = this.now();
    await this.repository.archive(id, timestamp, timestamp);
  }

  getById(id: string): Promise<Task | null> {
    return this.repository.getById(id);
  }

  listTasksForProject(projectId: string): Promise<Task[]> {
    return this.repository.listForProject(projectId);
  }

  private async requireTask(id: string): Promise<Task> {
    const task = await this.repository.getById(id);
    if (!task) throw new Error(`Task ${id} was not found.`);
    return task;
  }
}
