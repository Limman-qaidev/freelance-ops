import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { ExpenseRecord } from '@/domain/expenses/expense';
import type { Project } from '@/domain/projects/project';
import { useI18n } from '@/i18n/use-i18n';
import { useApplication } from '@/providers/application-context';
import { ActionButton } from '@/ui/components/action-button';
import { ScreenShell } from '@/ui/components/screen-shell';
import { useTheme } from '@/ui/theme/use-theme';

type ExpenseListItem = {
  record: ExpenseRecord;
  project: Project | null;
};

export default function ExpensesScreen() {
  const { expenseService, projectService } = useApplication();
  const { t } = useI18n();
  const { theme } = useTheme();
  const [items, setItems] = useState<ExpenseListItem[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    void expenseService
      .listRecent()
      .then(async (records) => {
        const next = await Promise.all(
          records.map(async (record) => ({
            record,
            project: await projectService.getById(record.expense.projectId),
          })),
        );
        if (mounted) setItems(next);
      })
      .catch(() => {
        if (mounted) setError(true);
      });
    return () => {
      mounted = false;
    };
  }, [expenseService, projectService]);

  return (
    <ScreenShell title={t('expenses.title')} subtitle={t('expenses.subtitle')}>
      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xxl }}
      >
        <View style={{ gap: theme.spacing.sm }}>
          <ActionButton
            label={t('common.addExpense')}
            accessibilityLabel={t('common.addExpense')}
            onPress={() => router.push('/expense/edit' as never)}
          />
          <ActionButton
            label={t('common.back')}
            variant="secondary"
            onPress={() => router.back()}
          />
        </View>

        {error ? (
          <Text
            accessibilityRole="alert"
            style={{ ...theme.typography.caption, color: theme.colors.error }}
          >
            {t('expenses.error')}
          </Text>
        ) : null}

        {items.length === 0 && !error ? (
          <View
            style={{
              padding: theme.spacing.lg,
              gap: theme.spacing.xs,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.lg,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>
              {t('expenses.emptyTitle')}
            </Text>
            <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
              {t('expenses.emptyBody')}
            </Text>
          </View>
        ) : null}

        {items.map(({ record, project }) => {
          const expense = record.expense;
          const label = expense.description || expense.category;
          return (
            <Pressable
              key={expense.id}
              accessibilityRole="button"
              accessibilityLabel={`${t('expenses.editLabel')} ${label}`}
              onPress={() =>
                router.push({
                  pathname: '/expense/edit' as never,
                  params: { id: expense.id },
                })
              }
              style={({ pressed }) => ({
                minHeight: theme.sizing.rowMinHeight,
                padding: theme.spacing.lg,
                gap: theme.spacing.xs,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.lg,
                backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
              })}
            >
              <View
                style={{
                  flexDirection: 'row',
                  gap: theme.spacing.sm,
                  alignItems: 'flex-start',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>
                    {expense.category}
                  </Text>
                  <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
                    {project?.name ?? t('expenses.unknownProject')}
                  </Text>
                </View>
                <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>
                  {formatMinor(expense.projectAmountMinor)} {expense.projectCurrency}
                </Text>
              </View>

              {expense.description ? (
                <Text style={{ ...theme.typography.body, color: theme.colors.textPrimary }}>
                  {expense.description}
                </Text>
              ) : null}

              <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
                {formatMinor(expense.originalAmountMinor)} {expense.originalCurrency} · FX{' '}
                {expense.exchangeRateDecimal}
              </Text>
              <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
                {expense.expenseDate}
              </Text>
              <Text style={{ ...theme.typography.caption, color: theme.colors.accent }}>
                {expense.billable ? t('common.billable') : t('common.nonBillable')} ·{' '}
                {expense.reimbursable
                  ? t('expenses.reimbursable')
                  : t('expenses.notReimbursable')}
              </Text>

              {record.integrityWarnings.includes('MISSING_ATTACHMENT') ? (
                <Text style={{ ...theme.typography.caption, color: theme.colors.warning }}>
                  {t('expenses.missingAttachment')}
                </Text>
              ) : null}
              {record.integrityWarnings.includes('CHECKSUM_MISMATCH') ? (
                <Text style={{ ...theme.typography.caption, color: theme.colors.warning }}>
                  {t('expenses.checksumMismatch')}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </ScreenShell>
  );
}

function formatMinor(value: number): string {
  return (value / 100).toFixed(2);
}
