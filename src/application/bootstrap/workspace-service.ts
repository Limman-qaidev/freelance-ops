import { generateUuid } from '@/domain/shared/id';
import type { Workspace, WorkspaceRepository } from '@/domain/shared/workspace';

type IdGenerator = () => string;
type Clock = () => string;

type DefaultWorkspaceInput = {
  name: string;
  defaultCurrency: string;
};

const systemClock: Clock = () => new Date().toISOString();

export class WorkspaceService {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly generateId: IdGenerator = generateUuid,
    private readonly now: Clock = systemClock,
  ) {}

  async ensureDefault(input: DefaultWorkspaceInput): Promise<Workspace> {
    const existing = await this.repository.getFirst();
    if (existing) return existing;

    const timestamp = this.now();
    const workspace: Workspace = {
      id: this.generateId(),
      name: input.name,
      defaultCurrency: input.defaultCurrency,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.repository.create(workspace);
    return workspace;
  }
}
