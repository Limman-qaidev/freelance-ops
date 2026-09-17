import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ApplicationContextProvider } from '../../src/providers/application-context';

let mockParams: { id?: string; projectId?: string } = { projectId: 'project-1' };

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: () => mockParams,
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

const receipt = {
  id: 'attachment-1',
  localUri: 'file:///documents/expense-attachments/attachment-1-receipt.pdf',
  originalFilename: 'receipt.pdf',
  mimeType: 'application/pdf',
  fileSizeBytes: 321,
  checksum: 'md5:receipt',
  createdAt: '2026-09-17T12:00:00.000Z',
};

const existingRecord = {
  expense: {
    id: 'expense-1',
    projectId: project.id,
    expenseDate: '2026-09-16',
    category: 'Travel',
    description: 'Taxi',
    originalAmountMinor: 1234,
    originalCurrency: 'USD',
    exchangeRateDecimal: '0.9',
    projectAmountMinor: 1111,
    projectCurrency: 'EUR',
    reimbursable: true,
    billable: false,
    status: 'PENDING',
    createdAt: '2026-09-16T12:00:00.000Z',
    updatedAt: '2026-09-16T12:00:00.000Z',
  },
  attachments: [
    {
      ...receipt,
      expenseId: 'expense-1',
    },
  ],
  integrityWarnings: [],
};

function loadEditor() {
  return (jest.requireActual('../../app/expense/edit') as { default: React.ComponentType }).default;
}

function makeApplication() {
  return {
    workspace: {
      id: 'workspace-1',
      name: 'Freelance Ops',
      defaultCurrency: 'EUR',
      createdAt: '2026-09-16T00:00:00.000Z',
      updatedAt: '2026-09-16T00:00:00.000Z',
    },
    projectService: {
      listActiveProjects: jest.fn(async () => [project]),
      getById: jest.fn(async () => project),
    },
    expenseService: {
      prepareReceipt: jest.fn(async () => receipt),
      discardPreparedReceipt: jest.fn(async () => undefined),
      create: jest.fn(async () => existingRecord),
      getById: jest.fn(async () => existingRecord),
      update: jest.fn(async () => existingRecord),
      addPreparedReceipt: jest.fn(async () => existingRecord),
      delete: jest.fn(async () => undefined),
    },
  };
}

describe('expense editor', () => {
  beforeEach(() => {
    mockParams = { projectId: 'project-1' };
    jest.clearAllMocks();
  });

  it('creates a project-linked multicurrency expense with a prepared receipt', async () => {
    const ExpenseEditor = loadEditor();
    const application = makeApplication();
    const view = await render(
      <ApplicationContextProvider application={application as never}>
        <ExpenseEditor />
      </ApplicationContextProvider>,
    );

    expect(await view.findByText('Mailing tool')).toBeTruthy();
    await fireEvent.changeText(view.getByLabelText('Expense date'), '2026-09-17');
    await fireEvent.changeText(view.getByLabelText('Expense category'), 'Travel');
    await fireEvent.changeText(view.getByLabelText('Expense amount'), '12.34');
    await fireEvent.changeText(view.getByLabelText('Expense currency'), 'USD');
    await fireEvent.changeText(view.getByLabelText('Exchange rate'), '0.9');
    await fireEvent.changeText(view.getByLabelText('Expense description'), 'Synthetic taxi');
    await fireEvent.press(view.getByLabelText('Set reimbursable'));
    await fireEvent.press(view.getByLabelText('Attach receipt'));

    expect(await view.findByText('receipt.pdf')).toBeTruthy();
    expect(view.getByText('Project amount: 11.11 EUR')).toBeTruthy();

    await fireEvent.press(view.getByLabelText('Save expense'));

    await waitFor(() => expect(application.expenseService.create).toHaveBeenCalledTimes(1));
    expect(application.expenseService.create).toHaveBeenCalledWith(
      {
        projectId: project.id,
        expenseDate: '2026-09-17',
        category: 'Travel',
        description: 'Synthetic taxi',
        originalAmount: '12.34',
        originalCurrency: 'USD',
        exchangeRateDecimal: '0.9',
        reimbursable: true,
        billable: false,
      },
      receipt,
    );
    expect(router.replace).toHaveBeenCalledWith('/expenses');
  });

  it('loads and edits an existing expense without losing existing receipt metadata', async () => {
    mockParams = { id: 'expense-1' };
    const ExpenseEditor = loadEditor();
    const application = makeApplication();
    const view = await render(
      <ApplicationContextProvider application={application as never}>
        <ExpenseEditor />
      </ApplicationContextProvider>,
    );

    expect(await view.findByText('receipt.pdf')).toBeTruthy();
    expect(view.getByLabelText('Expense amount').props.value).toBe('12.34');
    expect(view.getByLabelText('Expense currency').props.value).toBe('USD');
    expect(view.getByLabelText('Exchange rate').props.value).toBe('0.9');

    await fireEvent.changeText(view.getByLabelText('Expense description'), 'Corrected taxi');
    await fireEvent.press(view.getByLabelText('Save expense'));

    await waitFor(() => expect(application.expenseService.update).toHaveBeenCalledTimes(1));
    expect(application.expenseService.update).toHaveBeenCalledWith(
      'expense-1',
      expect.objectContaining({
        projectId: project.id,
        description: 'Corrected taxi',
        originalAmount: '12.34',
        originalCurrency: 'USD',
        exchangeRateDecimal: '0.9',
        billable: false,
      }),
    );
    expect(application.expenseService.addPreparedReceipt).not.toHaveBeenCalled();
  });
});
