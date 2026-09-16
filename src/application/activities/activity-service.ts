import {
  DEFAULT_ACTIVITY_NAMES,
  type Activity,
  type ActivityRepository,
  type CreateActivityInput,
  type UpdateActivityInput,
} from '@/domain/activities/activity';
import { generateUuid } from '@/domain/shared/id';

type IdGenerator = () => string;
type Clock = () => string;

const systemClock: Clock = () => new Date().toISOString();

export class ActivityService {
  constructor(
    private readonly repository: ActivityRepository,
    private readonly workspaceId: string,
    private readonly generateId: IdGenerator = generateUuid,
    private readonly now: Clock = systemClock,
  ) {}

  async ensureDefaults(): Promise<void> {
    const existing = await this.repository.listAll(this.workspaceId);
    if (existing.length > 0) return;

    for (const name of DEFAULT_ACTIVITY_NAMES) {
      await this.create({ name });
    }
  }

  async create(input: CreateActivityInput): Promise<Activity> {
    const activity: Activity = {
      id: this.generateId(),
      workspaceId: this.workspaceId,
      name: input.name,
      archivedAt: null,
      createdAt: this.now(),
    };

    await this.repository.create(activity);
    return activity;
  }

  async update(input: UpdateActivityInput): Promise<Activity> {
    const current = await this.requireActivity(input.id);
    const updated: Activity = {
      ...current,
      name: input.name,
    };

    await this.repository.update(updated);
    return updated;
  }

  async archive(id: string): Promise<void> {
    await this.requireActivity(id);
    await this.repository.archive(id, this.now());
  }

  getById(id: string): Promise<Activity | null> {
    return this.repository.getById(id);
  }

  listActive(): Promise<Activity[]> {
    return this.repository.listActive(this.workspaceId);
  }

  private async requireActivity(id: string): Promise<Activity> {
    const activity = await this.repository.getById(id);
    if (!activity) throw new Error(`Activity ${id} was not found.`);
    return activity;
  }
}
