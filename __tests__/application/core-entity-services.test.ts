type MutableEntity = {
  id: string;
  archivedAt: string | null;
};

function createMemoryRepository<T extends MutableEntity>() {
  const items = new Map<string, T>();

  return {
    items,
    create: async (entity: T) => {
      items.set(entity.id, entity);
    },
    update: async (entity: T) => {
      items.set(entity.id, entity);
    },
    archive: async (id: string, archivedAt: string, updatedAt?: string) => {
      const current = items.get(id);
      if (!current) return;
      items.set(id, {
        ...current,
        archivedAt,
        ...(updatedAt ? { updatedAt } : {}),
      });
    },
    getById: async (id: string) => items.get(id) ?? null,
  };
}

describe('core entity application services', () => {
  const workspaceId = '11111111-1111-4111-8111-111111111111';
  const now = () => '2026-09-16T19:00:00.000Z';

  it('creates and archives clients without losing historical lookup', async () => {
    const { ClientService } = jest.requireActual(
      '../../src/application/clients/client-service',
    ) as {
      ClientService: new (...args: any[]) => any;
    };
    const repository = createMemoryRepository<any>();
    const service = new ClientService(
      {
        ...repository,
        listActive: async () =>
          [...repository.items.values()].filter((item) => item.archivedAt === null),
      },
      workspaceId,
      () => '22222222-2222-4222-8222-222222222222',
      now,
    );

    const created = await service.create({ name: 'Synthetic Client' });

    expect(created).toMatchObject({
      id: '22222222-2222-4222-8222-222222222222',
      workspaceId,
      name: 'Synthetic Client',
      archivedAt: null,
      createdAt: now(),
      updatedAt: now(),
    });
    expect(await service.listActive()).toHaveLength(1);

    await service.archive(created.id);

    expect(await service.listActive()).toHaveLength(0);
    expect(await service.getById(created.id)).toMatchObject({
      id: created.id,
      archivedAt: now(),
    });
  });

  it('creates projects as PLANNED with currency and optional dates', async () => {
    const { ProjectService } = jest.requireActual(
      '../../src/application/projects/project-service',
    ) as {
      ProjectService: new (...args: any[]) => any;
    };
    const repository = createMemoryRepository<any>();
    const service = new ProjectService(
      {
        ...repository,
        listActive: async () => [...repository.items.values()],
      },
      workspaceId,
      () => '33333333-3333-4333-8333-333333333333',
      now,
    );

    const project = await service.create({
      clientId: 'client-1',
      name: 'Synthetic Spare Parts',
      projectCurrency: 'EUR',
      plannedStartDate: '2026-09-20',
      plannedEndDate: '2026-10-31',
    });

    expect(project).toMatchObject({
      status: 'PLANNED',
      projectCurrency: 'EUR',
      plannedStartDate: '2026-09-20',
      plannedEndDate: '2026-10-31',
      archivedAt: null,
    });
  });

  it('creates tasks as PENDING with optional estimate and dates', async () => {
    const { TaskService } = jest.requireActual(
      '../../src/application/tasks/task-service',
    ) as {
      TaskService: new (...args: any[]) => any;
    };
    const repository = createMemoryRepository<any>();
    const service = new TaskService(
      {
        ...repository,
        listForProject: async (projectId: string) =>
          [...repository.items.values()].filter(
            (item) => item.projectId === projectId && item.archivedAt === null,
          ),
      },
      () => '44444444-4444-4444-8444-444444444444',
      now,
    );

    const task = await service.create({
      projectId: 'project-1',
      name: 'Synthetic Parser',
      estimatedMinutes: 240,
      plannedStartDate: '2026-09-21',
      plannedEndDate: '2026-09-24',
    });

    expect(task).toMatchObject({
      status: 'PENDING',
      estimatedMinutes: 240,
      plannedStartDate: '2026-09-21',
      plannedEndDate: '2026-09-24',
      archivedAt: null,
    });
  });

  it('seeds default activities idempotently', async () => {
    const { ActivityService } = jest.requireActual(
      '../../src/application/activities/activity-service',
    ) as {
      ActivityService: new (...args: any[]) => any;
    };
    const repository = createMemoryRepository<any>();
    let sequence = 0;
    const service = new ActivityService(
      {
        ...repository,
        archive: async (id: string, archivedAt: string) => {
          const current = repository.items.get(id);
          if (current) repository.items.set(id, { ...current, archivedAt });
        },
        listActive: async () =>
          [...repository.items.values()].filter((item) => item.archivedAt === null),
      },
      workspaceId,
      () => `55555555-5555-4555-8555-${String(sequence++).padStart(12, '0')}`,
      now,
    );

    await service.ensureDefaults();
    await service.ensureDefaults();

    expect((await service.listActive()).map((activity: any) => activity.name)).toEqual([
      'Development',
      'Analysis',
      'Meeting',
      'Documentation',
      'Support',
      'Management',
      'Other',
    ]);
  });
});
