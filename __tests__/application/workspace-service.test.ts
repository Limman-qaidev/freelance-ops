describe('WorkspaceService', () => {
  it('creates exactly one default workspace and reuses it on later startup', async () => {
    const { WorkspaceService } = jest.requireActual(
      '../../src/application/bootstrap/workspace-service',
    ) as {
      WorkspaceService: new (...args: any[]) => any;
    };

    let workspace: any = null;
    const repository = {
      getFirst: async () => workspace,
      create: async (value: any) => {
        workspace = value;
      },
    };
    let idCalls = 0;
    const service = new WorkspaceService(
      repository,
      () => {
        idCalls += 1;
        return 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      },
      () => '2026-09-16T19:15:00.000Z',
    );

    const first = await service.ensureDefault({
      name: 'Freelance Ops',
      defaultCurrency: 'EUR',
    });
    const second = await service.ensureDefault({
      name: 'Ignored on reopen',
      defaultCurrency: 'USD',
    });

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      name: 'Freelance Ops',
      defaultCurrency: 'EUR',
      createdAt: '2026-09-16T19:15:00.000Z',
      updatedAt: '2026-09-16T19:15:00.000Z',
    });
    expect(idCalls).toBe(1);
  });
});
