import {
  type Client,
  type ClientRepository,
  type CreateClientInput,
  type UpdateClientInput,
} from '@/domain/clients/client';
import { generateUuid } from '@/domain/shared/id';

type IdGenerator = () => string;
type Clock = () => string;

const systemClock: Clock = () => new Date().toISOString();

export class ClientService {
  constructor(
    private readonly repository: ClientRepository,
    private readonly workspaceId: string,
    private readonly generateId: IdGenerator = generateUuid,
    private readonly now: Clock = systemClock,
  ) {}

  async create(input: CreateClientInput): Promise<Client> {
    const timestamp = this.now();
    const client: Client = {
      id: this.generateId(),
      workspaceId: this.workspaceId,
      name: input.name,
      legalName: input.legalName ?? null,
      notes: input.notes ?? null,
      archivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.repository.create(client);
    return client;
  }

  async update(input: UpdateClientInput): Promise<Client> {
    const current = await this.requireClient(input.id);
    const updated: Client = {
      ...current,
      name: input.name,
      legalName: input.legalName ?? null,
      notes: input.notes ?? null,
      updatedAt: this.now(),
    };

    await this.repository.update(updated);
    return updated;
  }

  async archive(id: string): Promise<void> {
    await this.requireClient(id);
    const timestamp = this.now();
    await this.repository.archive(id, timestamp, timestamp);
  }

  getById(id: string): Promise<Client | null> {
    return this.repository.getById(id);
  }

  listActive(): Promise<Client[]> {
    return this.repository.listActive(this.workspaceId);
  }

  private async requireClient(id: string): Promise<Client> {
    const client = await this.repository.getById(id);
    if (!client) throw new Error(`Client ${id} was not found.`);
    return client;
  }
}
