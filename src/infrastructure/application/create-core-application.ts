import { ActivityService } from '@/application/activities/activity-service';
import { WorkspaceService } from '@/application/bootstrap/workspace-service';
import { ClientService } from '@/application/clients/client-service';
import { ProjectService } from '@/application/projects/project-service';
import { TaskService } from '@/application/tasks/task-service';
import type { Workspace } from '@/domain/shared/workspace';
import type { DataDatabase } from '@/infrastructure/database/data-database';
import { SqliteActivityRepository } from '@/infrastructure/repositories/sqlite-activity-repository';
import { SqliteClientRepository } from '@/infrastructure/repositories/sqlite-client-repository';
import { SqliteProjectRepository } from '@/infrastructure/repositories/sqlite-project-repository';
import { SqliteTaskRepository } from '@/infrastructure/repositories/sqlite-task-repository';
import { SqliteWorkspaceRepository } from '@/infrastructure/repositories/sqlite-workspace-repository';

export type CoreApplication = {
  workspace: Workspace;
  clientService: ClientService;
  projectService: ProjectService;
  taskService: TaskService;
  activityService: ActivityService;
};

export type CoreApplicationOptions = {
  workspaceName: string;
  defaultCurrency: string;
};

export async function createCoreApplication(
  database: DataDatabase,
  options: CoreApplicationOptions,
): Promise<CoreApplication> {
  const workspaceRepository = new SqliteWorkspaceRepository(database);
  const workspaceService = new WorkspaceService(workspaceRepository);
  const workspace = await workspaceService.ensureDefault({
    name: options.workspaceName,
    defaultCurrency: options.defaultCurrency,
  });

  const clientService = new ClientService(
    new SqliteClientRepository(database),
    workspace.id,
  );
  const projectService = new ProjectService(
    new SqliteProjectRepository(database),
    workspace.id,
  );
  const taskService = new TaskService(new SqliteTaskRepository(database));
  const activityService = new ActivityService(
    new SqliteActivityRepository(database),
    workspace.id,
  );

  await activityService.ensureDefaults();

  return {
    workspace,
    clientService,
    projectService,
    taskService,
    activityService,
  };
}
