import { ActivityService } from '@/application/activities/activity-service';
import { WorkspaceService } from '@/application/bootstrap/workspace-service';
import { ClientService } from '@/application/clients/client-service';
import { ProjectService } from '@/application/projects/project-service';
import { TaskService } from '@/application/tasks/task-service';
import { ManualTimeService } from '@/application/time-tracking/manual-time-service';
import { TimeTrackingService } from '@/application/time-tracking/time-tracking-service';
import type { Workspace } from '@/domain/shared/workspace';
import type { TransactionalDataDatabase } from '@/infrastructure/database/data-database';
import { SqliteActivityRepository } from '@/infrastructure/repositories/sqlite-activity-repository';
import { SqliteClientRepository } from '@/infrastructure/repositories/sqlite-client-repository';
import { SqliteProjectRepository } from '@/infrastructure/repositories/sqlite-project-repository';
import { SqliteTaskRepository } from '@/infrastructure/repositories/sqlite-task-repository';
import { SqliteTimeHistoryRepository } from '@/infrastructure/repositories/sqlite-time-history-repository';
import { SqliteTimeTrackingRepository } from '@/infrastructure/repositories/sqlite-time-tracking-repository';
import { SqliteWorkspaceRepository } from '@/infrastructure/repositories/sqlite-workspace-repository';

export type CoreApplication = {
  workspace: Workspace;
  clientService: ClientService;
  projectService: ProjectService;
  taskService: TaskService;
  activityService: ActivityService;
  timeTrackingService: TimeTrackingService;
  manualTimeService: ManualTimeService;
};

export type CoreApplicationOptions = {
  workspaceName: string;
  defaultCurrency: string;
};

export async function createCoreApplication(
  database: TransactionalDataDatabase,
  options: CoreApplicationOptions,
): Promise<CoreApplication> {
  const workspaceRepository = new SqliteWorkspaceRepository(database);
  const workspaceService = new WorkspaceService(workspaceRepository);
  const workspace = await workspaceService.ensureDefault({
    name: options.workspaceName,
    defaultCurrency: options.defaultCurrency,
  });

  const projectRepository = new SqliteProjectRepository(database);
  const taskRepository = new SqliteTaskRepository(database);
  const activityRepository = new SqliteActivityRepository(database);

  const clientService = new ClientService(
    new SqliteClientRepository(database),
    workspace.id,
  );
  const projectService = new ProjectService(projectRepository, workspace.id);
  const taskService = new TaskService(taskRepository);
  const activityService = new ActivityService(activityRepository, workspace.id);
  const timeTrackingService = new TimeTrackingService(
    new SqliteTimeTrackingRepository(database),
    projectRepository,
    taskRepository,
  );
  const manualTimeService = new ManualTimeService(
    new SqliteTimeHistoryRepository(database),
    projectRepository,
    taskRepository,
    activityRepository,
  );

  await activityService.ensureDefaults();

  return {
    workspace,
    clientService,
    projectService,
    taskService,
    activityService,
    timeTrackingService,
    manualTimeService,
  };
}
