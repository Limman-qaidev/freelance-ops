import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ApplicationContextProvider } from '../../src/providers/application-context';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
}));

const project = {
  id: 'project-1',
  clientId: 'client-1',
  name: 'Mailing tool',
  description: null,
  status: 'ACTIVE',
  plannedStartDate: null,
  plannedEndDate: null,
  actualStartDate: null,
  actualEndDate: null,
  projectCurrency: 'EUR',
  archivedAt: null,
  createdAt: '2026-09-16T00:00:00.000Z',
  updatedAt: '2026-09-16T00:00:00.000Z',
};

const record = {
  expense: {
    id: 'expense-1',
    projectId: project.id,
    expenseDate: '2026-09-17',
    category: 'Travel',
    description: 'Taxi',
    originalAmountMinor: 1234,
    originalCurrency: 'USD',
    exchangeRateDecimal: '0.9',
    projectAmountMinor: 1111,
    projectCurrency: 'EUR',
    reimbursable: true,
    status: 'PENDING',
    createdAt: '2026-09-17T12:00:00.000Z',
    updatedAt: '2026-09-17T12:00:00.000Z',
  },
  attachments: [
    {
      id: 'attachment-1',
      expenseId: 'expense-1',
      localUri: 'file:///documents/expense-attachments/attachment-1-receipt.pdf',
      originalFilename: 'receipt.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 321,
      checksum: 'md5:receipt',
      createdAt: '2026-09-17T12:00:00.000Z',
    },
  ],
  integrityWarnings: ['MISSING_ATTACHMENT'],
};

function loadExpenses() {
  return (jest.requireActual('../../app/expenses') as { default: React.ComponentType }).default;
}

describe('expenses', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists recent project expenses, surfaces attachment integrity warnings and opens create/edit routes', async () => {
    const application = {
      projectService: {
        getById: jest.fn(async () => project),
      },
      expenseService: {
        listRecent: jest.fn(async () => [record]),
      },
    };
    const ExpensesScreen = loadExpenses();
    const view = await render(
      <ApplicationContextProvider application={application as never}>
        <ExpensesScreen />
      </ApplicationContextProvider>,
    );

    expect(await view.findByText('Mailing tool')).toBeTruthy();
    expect(view.getByText('Travel')).toBeTruthy();
    expect(view.getByText('11.11 EUR')).toBeTruthy();
    expect(view.getByText('12.34 USD · FX 0.9')).toBeTruthy();
    expect(view.getByText(/receipt file is missing/i)).toBeTruthy();

    await fireEvent.press(view.getByLabelText('Add expense'));
    expect(router.push).toHaveBeenCalledWith('/expense/edit');

    await fireEvent.press(view.getByLabelText('Edit expense Taxi'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/expense/edit',
      params: { id: 'expense-1' },
    });

    await waitFor(() => expect(application.expenseService.listRecent).toHaveBeenCalled());
  });
});
