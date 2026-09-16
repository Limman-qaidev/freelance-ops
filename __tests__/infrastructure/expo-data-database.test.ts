describe('createExpoDataDatabase', () => {
  it('forwards parameterized reads and writes without exposing the raw SQLite handle', async () => {
    const { createExpoDataDatabase } = jest.requireActual(
      '../../src/infrastructure/database/expo-data-database',
    ) as {
      createExpoDataDatabase: (database: any) => any;
    };

    const runAsync = jest.fn(async () => ({ changes: 1 }));
    const getFirstAsync = jest.fn(async () => ({ id: 'row-1' }));
    const getAllAsync = jest.fn(async () => [{ id: 'row-1' }, { id: 'row-2' }]);
    const rawDatabase = { runAsync, getFirstAsync, getAllAsync };
    const database = createExpoDataDatabase(rawDatabase);

    await database.runAsync('UPDATE test SET name = ? WHERE id = ?', 'Name', 'row-1');
    await expect(database.getFirstAsync('SELECT * FROM test WHERE id = ?', 'row-1')).resolves.toEqual({
      id: 'row-1',
    });
    await expect(database.getAllAsync('SELECT * FROM test WHERE name = ?', 'Name')).resolves.toHaveLength(2);

    expect(runAsync).toHaveBeenCalledWith(
      'UPDATE test SET name = ? WHERE id = ?',
      'Name',
      'row-1',
    );
    expect(getFirstAsync).toHaveBeenCalledWith('SELECT * FROM test WHERE id = ?', 'row-1');
    expect(getAllAsync).toHaveBeenCalledWith('SELECT * FROM test WHERE name = ?', 'Name');
    expect(database).not.toHaveProperty('execAsync');
  });
});
