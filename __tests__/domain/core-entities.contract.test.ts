describe('core entity domain contracts', () => {
  it('exposes the approved statuses, default activities and UUID generator', () => {
    const projectModule = jest.requireActual('../../src/domain/projects/project') as {
      PROJECT_STATUSES: readonly string[];
    };
    const taskModule = jest.requireActual('../../src/domain/tasks/task') as {
      TASK_STATUSES: readonly string[];
    };
    const activityModule = jest.requireActual('../../src/domain/activities/activity') as {
      DEFAULT_ACTIVITY_NAMES: readonly string[];
    };
    const idModule = jest.requireActual('../../src/domain/shared/id') as {
      generateUuid(): string;
    };

    expect(projectModule.PROJECT_STATUSES).toEqual([
      'PLANNED',
      'ACTIVE',
      'ON_HOLD',
      'COMPLETED',
      'CANCELLED',
    ]);
    expect(taskModule.TASK_STATUSES).toEqual([
      'PENDING',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
    ]);
    expect(activityModule.DEFAULT_ACTIVITY_NAMES).toEqual([
      'Development',
      'Analysis',
      'Meeting',
      'Documentation',
      'Support',
      'Management',
      'Other',
    ]);

    const first = idModule.generateUuid();
    const second = idModule.generateUuid();

    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(second).not.toBe(first);
  });
});
