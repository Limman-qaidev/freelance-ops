export interface Workspace {
  id: string;
  name: string;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceRepository {
  create(workspace: Workspace): Promise<void>;
  getFirst(): Promise<Workspace | null>;
}
