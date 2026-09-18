import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { calculateExpenseAmounts } from '@/application/expenses/expense-money';
import type { PreparedExpenseAttachment } from '@/domain/expenses/expense';
import type { Project } from '@/domain/projects/project';
import { useI18n } from '@/i18n/use-i18n';
import { useApplication } from '@/providers/application-context';
import { ActionButton } from '@/ui/components/action-button';
import { TextField } from '@/ui/components/form-fields';
import { ScreenShell } from '@/ui/components/screen-shell';
import { SectionHeader } from '@/ui/components/section-header';
import { SelectionChip } from '@/ui/components/selection-chip';
import { useTheme } from '@/ui/theme/use-theme';

const minorDigits = (currency: string) =>
  ['JPY', 'KRW', 'VND'].includes(currency.toUpperCase()) ? 0 : 2;

const formatMinor = (value: number, currency: string) =>
  (value / 10 ** minorDigits(currency)).toFixed(minorDigits(currency));

export default function ExpenseEditorScreen() {
  const params = useLocalSearchParams<{ id?: string; projectId?: string }>();
  const { expenseService, projectService } = useApplication();
  const { t } = useI18n();
  const { theme } = useTheme();

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(params.projectId ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [fx, setFx] = useState('');
  const [reimbursable, setReimbursable] = useState(false);
  const [billable, setBillable] = useState(false);
  const [existing, setExisting] = useState<string[]>([]);
  const [receipts, setReceipts] = useState<PreparedExpenseAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    void projectService
      .listActiveProjects()
      .then((items) => {
        if (!mounted) return;
        setProjects(items);
        if (!projectId && items[0]) setProjectId(items[0].id);
      })
      .catch(() => {
        if (mounted) setError(t('expenseEditor.loadProjectsError'));
      });
    return () => {
      mounted = false;
    };
  }, [projectId, projectService, t]);

  useEffect(() => {
    if (!params.id) return;
    let mounted = true;
    void expenseService
      .getById(params.id)
      .then((record) => {
        if (!mounted || !record) return;
        const item = record.expense;
        setProjectId(item.projectId);
        setDate(item.expenseDate);
        setCategory(item.category);
        setDescription(item.description ?? '');
        setAmount(formatMinor(item.originalAmountMinor, item.originalCurrency));
        setCurrency(item.originalCurrency);
        setFx(item.exchangeRateDecimal === '1' ? '' : item.exchangeRateDecimal);
        setReimbursable(item.reimbursable);
        setBillable(item.billable ?? false);
        setExisting(record.attachments.map((attachment) => attachment.originalFilename));
      })
      .catch(() => {
        if (mounted) setError(t('expenseEditor.loadExpenseError'));
      });
    return () => {
      mounted = false;
    };
  }, [expenseService, params.id, t]);

  const project = projects.find((item) => item.id === projectId);
  const preview = useMemo(() => {
    if (!project || !amount.trim() || !currency.trim()) return null;
    try {
      return calculateExpenseAmounts({
        originalAmount: amount.replace(',', '.'),
        originalCurrency: currency,
        projectCurrency: project.projectCurrency,
        exchangeRateDecimal: fx.trim().replace(',', '.') || null,
      });
    } catch {
      return null;
    }
  }, [amount, currency, fx, project]);

  async function attach() {
    setError(null);
    try {
      const receipt = await expenseService.prepareReceipt();
      if (receipt) setReceipts((current) => [...current, receipt]);
    } catch {
      setError(t('expenseEditor.attachError'));
    }
  }

  async function removeReceipt(receipt: PreparedExpenseAttachment) {
    await expenseService.discardPreparedReceipt(receipt).catch(() => undefined);
    setReceipts((items) => items.filter((item) => item.id !== receipt.id));
  }

  async function save() {
    if (!projectId) {
      setError(t('expenseEditor.projectRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    const input = {
      projectId,
      expenseDate: date,
      category,
      description,
      originalAmount: amount.replace(',', '.'),
      originalCurrency: currency,
      exchangeRateDecimal: fx.trim() ? fx.replace(',', '.') : null,
      reimbursable,
      billable,
    };
    try {
      if (params.id) {
        await expenseService.update(params.id, input);
        for (const receipt of receipts) {
          await expenseService.addPreparedReceipt(params.id, receipt);
        }
      } else {
        await expenseService.create(
          input,
          receipts.length === 0 ? undefined : receipts.length === 1 ? receipts[0] : receipts,
        );
      }
      router.replace('/expenses' as never);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('expenseEditor.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell
      title={params.id ? t('expenseEditor.editTitle') : t('expenseEditor.newTitle')}
      subtitle={t('expenseEditor.subtitle')}
    >
      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <Text accessibilityRole="alert" style={{ ...theme.typography.caption, color: theme.colors.error }}>
            {error}
          </Text>
        ) : null}

        <SectionHeader title={t('expenseEditor.details')} />

        <View style={{ gap: theme.spacing.sm }}>
          <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
            {t('expenseEditor.project')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {projects.map((item) => (
              <SelectionChip
                key={item.id}
                label={item.name}
                selected={projectId === item.id}
                accessibilityLabel={`${t('expenseEditor.selectProject')} ${item.name}`}
                onPress={() => setProjectId(item.id)}
              />
            ))}
          </View>
        </View>

        <TextField
          label={t('expenseEditor.date')}
          accessibilityLabel={t('expenseEditor.dateA11y')}
          helperText="YYYY-MM-DD"
          value={date}
          onChangeText={setDate}
          autoCapitalize="none"
        />

        <TextField
          label={t('expenseEditor.category')}
          accessibilityLabel={t('expenseEditor.categoryA11y')}
          value={category}
          onChangeText={setCategory}
        />

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <TextField
              label={t('expenseEditor.amount')}
              accessibilityLabel={t('expenseEditor.amountA11y')}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label={t('expenseEditor.currency')}
              accessibilityLabel={t('expenseEditor.currencyA11y')}
              autoCapitalize="characters"
              value={currency}
              onChangeText={(value) => setCurrency(value.toUpperCase())}
            />
          </View>
        </View>

        {project && currency.trim().toUpperCase() !== project.projectCurrency ? (
          <TextField
            label={t('expenseEditor.exchangeRate')}
            accessibilityLabel={t('expenseEditor.exchangeRate')}
            helperText={`1 ${currency || 'CUR'} = ? ${project.projectCurrency}`}
            keyboardType="decimal-pad"
            value={fx}
            onChangeText={setFx}
          />
        ) : null}

        <TextField
          label={t('expenseEditor.descriptionOptional')}
          accessibilityLabel={t('expenseEditor.descriptionA11y')}
          multiline
          value={description}
          onChangeText={setDescription}
        />

        {preview ? (
          <View
            style={{
              padding: theme.spacing.md,
              borderRadius: theme.radii.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.accentSoft,
            }}
          >
            <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>
              {t('expenseEditor.projectAmount')}: {formatMinor(preview.projectAmountMinor, preview.projectCurrency)} {preview.projectCurrency}
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel={t('expenseEditor.markReimbursable')}
            accessibilityState={{ checked: reimbursable }}
            onPress={() => setReimbursable((value) => !value)}
            style={({ pressed }) => ({
              minHeight: 48,
              paddingHorizontal: theme.spacing.md,
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: reimbursable ? theme.colors.accent : theme.colors.border,
              borderRadius: theme.radii.md,
              backgroundColor: pressed
                ? theme.colors.surfaceMuted
                : reimbursable
                  ? theme.colors.accentSoft
                  : theme.colors.surface,
            })}
          >
            <Text style={{ ...theme.typography.caption, color: theme.colors.textPrimary }}>
              {reimbursable ? t('expenses.reimbursable') : t('expenses.notReimbursable')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel={t('expenseEditor.markBillable')}
            accessibilityState={{ checked: billable }}
            onPress={() => setBillable((value) => !value)}
            style={({ pressed }) => ({
              minHeight: 48,
              paddingHorizontal: theme.spacing.md,
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: billable ? theme.colors.accent : theme.colors.border,
              borderRadius: theme.radii.md,
              backgroundColor: pressed
                ? theme.colors.surfaceMuted
                : billable
                  ? theme.colors.accentSoft
                  : theme.colors.surface,
            })}
          >
            <Text style={{ ...theme.typography.caption, color: theme.colors.textPrimary }}>
              {billable ? t('common.billable') : t('common.nonBillable')}
            </Text>
          </Pressable>
        </View>

        <ActionButton
          label={t('expenseEditor.attach')}
          accessibilityLabel={t('expenseEditor.attach')}
          variant="secondary"
          onPress={() => void attach()}
        />

        {[...existing, ...receipts.map((receipt) => receipt.originalFilename)].map((name, index) => (
          <Text
            key={`${name}-${index}`}
            style={{ ...theme.typography.caption, color: theme.colors.textPrimary }}
          >
            {name}
          </Text>
        ))}

        {receipts.map((receipt) => (
          <Pressable
            key={receipt.id}
            accessibilityRole="button"
            accessibilityLabel={`${t('expenseEditor.remove')} ${receipt.originalFilename}`}
            onPress={() => void removeReceipt(receipt)}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ ...theme.typography.caption, color: theme.colors.error }}>
              {t('expenseEditor.remove')} {receipt.originalFilename}
            </Text>
          </Pressable>
        ))}

        <ActionButton
          label={saving ? t('expenseEditor.saving') : t('expenseEditor.save')}
          accessibilityLabel={t('expenseEditor.save')}
          disabled={saving}
          onPress={() => void save()}
        />
        <ActionButton label={t('more.cancel')} variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </ScreenShell>
  );
}
