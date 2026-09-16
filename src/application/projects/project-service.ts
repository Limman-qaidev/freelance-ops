import {
  type CreateProjectInput,
  type Project,
  type ProjectRepository,
  type UpdateProjectInput,
} from '@/domain/projects/project';
import { generateUuid } from '@/domain/shared/id';

type IdGenerator = () => string;
type Clock = () => string;

const systemClock: Clock = () => new Date().toISOString();

export class ProjectService {
  constructor(
    private readonly repository: ProjectRepository,
    private readonly workspaceId: string,
    private readonly generateId: IdGenerator = generateUuid,
    private readonly now: Clock = systemClock,
  ) {}

  async create(input: CreateProjectInput): Promise<Project> {
    const timestamp = this.now();
    const project: Project = {
      id: this.generateId(),
      clientId: input.clientId,
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? 'PLANNED',
      plannedStartDate: input.plannedStartDate ?? null,
      plannedEndDate: input.plannedEndDate ?? null,
      actualStartDate: null,
      actualEndDate: null,
      projectCurrency: input.projectCurrency,
      archivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.repository.create(project);
    return project;
  }

  async update(input: UpdateProjectInput): Promise<Project> {
    const current = await this.requireProject(input.id);
    const updated: Project = {
      ...current,
      clientId: input.clientId,
      name: input.name,
      description: input.description ?? null,
      status: input.status,
      plannedStartDate: input.plannedStartDate ?? null,
      plannedEndDate: input.plannedEndDate ?? null,
      actualStartDate: input.actualStartDate ?? null,
      actualEndDate: input.actualEndDate ?? null,
      projectCurrency: input.projectCurrency,
      updatedAt: this.now(),
    };

    await this.repository.update(updated);
    return updated;
  }

  async archive(id: string): Promise<void> {
    await this.requireProject(id);
    const timestamp = this.now();
    await this.repository.archive(id, timestamp, timestamp);
  }

  getById(id: string): Promise<Project | null> {
    return this.repository.getById(id);
  }

  listActiveProjects(): Promise<Project[]> {
    return this.repository.listActive(this.workspaceId);
  }

  private async requireProject(id: string): Promise<Project> {
    const project = await this.repository.getById(id);
    if (!project) throw new Error(`Project ${id} was not found.`);
    return project;
  }
}
