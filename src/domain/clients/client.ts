export interface Client {
  id: string;
  workspaceId: string;
  name: string;
  legalName: string | null;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientInput {
  name: string;
  legalName?: string | null;
  notes?: string | null;
}

export interface UpdateClientInput {
  id: string;
  name: string;
  legalName?: string | null;
  notes?: string | null;
}

export interface ClientRepository {
  create(client: Client): Promise<void>;
  update(client: Client): Promise<void>;
  archive(id: string, archivedAt: string, updatedAt: string): Promise<void>;
  getById(id: string): Promise<Client | null>;
  listActive(workspaceId: string): Promise<Client[]>;
}
