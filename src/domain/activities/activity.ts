export const DEFAULT_ACTIVITY_NAMES = [
  'Development',
  'Analysis',
  'Meeting',
  'Documentation',
  'Support',
  'Management',
  'Other',
] as const;

export interface Activity {
  id: string;
  workspaceId: string;
  name: string;
  archivedAt: string | null;
  createdAt: string;
}

export interface CreateActivityInput {
  name: string;
}

export interface UpdateActivityInput {
  id: string;
  name: string;
}

export interface ActivityRepository {
  create(activity: Activity): Promise<void>;
  update(activity: Activity): Promise<void>;
  archive(id: string, archivedAt: string): Promise<void>;
  getById(id: string): Promise<Activity | null>;
  listActive(workspaceId: string): Promise<Activity[]>;
}
