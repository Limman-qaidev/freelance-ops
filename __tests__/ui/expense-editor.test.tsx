import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { I18nProvider } from '../../src/i18n/i18n-provider';
import { ApplicationContextProvider } from '../../src/providers/application-context';
import { darkTheme } from '../../src/ui/theme/theme';
import { ThemeProvider } from '../../src/ui/theme/theme-provider';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'es' }] }));

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
  beforeEach(async () => {
    mockParams = { projectId: 'project-1' };
    await AsyncStorage.clear();
    await AsyncStorage.setItem('freelance-ops:language', 'es');
    jest.clearAllMocks();
  });

  it('creates a project-linked multicurrency expense with a prepared receipt', async () => {
    const ExpenseEditor = loadEditor();
    const application = makeApplication();
    const view = await render(
      <ThemeProvider systemColorScheme="dark"><I18nProvider><ApplicationContextProvider application={application as never}>
        <ExpenseEditor />
      </ApplicationContextProvider></I18nProvider></ThemeProvider>,
    );

    expect(await view.findByText('Nuevo gasto')).toBeTruthy();
    expect(await view.findByText('Mailing tool')).toBeTruthy();
    expect(view.getByLabelText('Importe del gasto')).toHaveStyle({ backgroundColor: darkTheme.colors.surface, color: darkTheme.colors.textPrimary, minHeight: 48 });
    await fireEvent.changeText(view.getByLabelText('Fecha del gasto'), '2026-09-17');
    await fireEvent.changeText(view.getByLabelText('Categoría del gasto'), 'Travel');
    await fireEvent.changeText(view.getByLabelText('Importe del gasto'), '12.34');
    await fireEvent.changeText(view.getByLabelText('Moneda del gasto'), 'USD');
    await fireEvent.changeText(view.getByLabelText('Tipo de cambio'), '0.9');
    await fireEvent.changeText(view.getByLabelText('Descripción del gasto'), 'Synthetic taxi');
    await fireEvent.press(view.getByLabelText('Marcar como reembolsable'));
    await fireEvent.press(view.getByLabelText('Adjuntar recibo'));

    expect(await view.findByText('receipt.pdf')).toBeTruthy();
    expect(view.getByText('Importe del proyecto: 11.11 EUR')).toBeTruthy();

    await fireEvent.press(view.getByLabelText('Guardar gasto'));

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
      <ThemeProvider systemColorScheme="dark"><I18nProvider><ApplicationContextProvider application={application as never}>
        <ExpenseEditor />
      </ApplicationContextProvider></I18nProvider></ThemeProvider>,
    );

    expect(await view.findByText('receipt.pdf')).toBeTruthy();
    expect(view.getByLabelText('Importe del gasto').props.value).toBe('12.34');
    expect(view.getByLabelText('Moneda del gasto').props.value).toBe('USD');
    expect(view.getByLabelText('Tipo de cambio').props.value).toBe('0.9');

    await fireEvent.changeText(view.getByLabelText('Descripción del gasto'), 'Corrected taxi');
    await fireEvent.press(view.getByLabelText('Guardar gasto'));

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
