import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ExpenseRecord } from '@/domain/expenses/expense';
import type { Project } from '@/domain/projects/project';
import { useApplication } from '@/providers/application-context';
import { ScreenShell } from '@/ui/components/screen-shell';
import { colors, radii, spacing, typography } from '@/ui/theme/tokens';

type ExpenseListItem = {
  record: ExpenseRecord;
  project: Project | null;
};

export default function ExpensesScreen() {
  const { expenseService, projectService } = useApplication();
  const [items, setItems] = useState<ExpenseListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

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
        if (mounted) setError('Unable to load expenses from local storage.');
      });
    return () => {
      mounted = false;
    };
  }, [expenseService, projectService]);

  return (
    <ScreenShell
      title="Expenses"
      subtitle="Local project expenses and their receipt integrity state."
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add expense"
            style={styles.primaryButton}
            onPress={() => router.push('/expense/edit' as never)}
          >
            <Text style={styles.primaryText}>Add expense</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryText}>Back</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {items.length === 0 && !error ? (
          <View style={styles.card}>
            <Text style={styles.title}>No expenses yet</Text>
            <Text style={styles.muted}>Add the first project expense when you need it.</Text>
          </View>
        ) : null}

        {items.map(({ record, project }) => {
          const expense = record.expense;
          const label = expense.description || expense.category;
          return (
            <Pressable
              key={expense.id}
              accessibilityRole="button"
              accessibilityLabel={`Edit expense ${label}`}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: '/expense/edit' as never,
                  params: { id: expense.id },
                })
              }
            >
              <View style={styles.headerRow}>
                <View style={styles.flex}>
                  <Text style={styles.title}>{expense.category}</Text>
                  <Text style={styles.muted}>{project?.name ?? 'Unknown project'}</Text>
                </View>
                <Text style={styles.amount}>
                  {formatMinor(expense.projectAmountMinor)} {expense.projectCurrency}
                </Text>
              </View>
              {expense.description ? <Text style={styles.body}>{expense.description}</Text> : null}
              <Text style={styles.muted}>
                {formatMinor(expense.originalAmountMinor)} {expense.originalCurrency} · FX {expense.exchangeRateDecimal}
              </Text>
              <Text style={styles.muted}>{expense.expenseDate}</Text>
              <Text style={styles.flags}>
                {expense.billable ? 'Billable' : 'Non-billable'} · {expense.reimbursable ? 'Reimbursable' : 'Not reimbursable'}
              </Text>
              {record.integrityWarnings.includes('MISSING_ATTACHMENT') ? (
                <Text style={styles.warning}>A receipt file is missing. You can keep the expense and attach a replacement.</Text>
              ) : null}
              {record.integrityWarnings.includes('CHECKSUM_MISMATCH') ? (
                <Text style={styles.warning}>A receipt file changed after it was attached. Re-attach it to restore integrity.</Text>
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

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  primaryButton: { backgroundColor: colors.accent, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  primaryText: { color: colors.surface, fontWeight: '700' },
  secondaryButton: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  secondaryText: { color: colors.textPrimary, fontWeight: '600' },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs },
  headerRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  flex: { flex: 1 },
  title: { color: colors.textPrimary, fontSize: typography.body, fontWeight: '700' },
  amount: { color: colors.textPrimary, fontSize: typography.body, fontWeight: '700' },
  body: { color: colors.textPrimary, fontSize: typography.body },
  muted: { color: colors.textMuted, fontSize: typography.caption },
  flags: { color: colors.accent, fontSize: typography.caption, fontWeight: '600' },
  warning: { color: '#92400E', fontSize: typography.caption, fontWeight: '600' },
  error: { color: '#B91C1C', fontSize: typography.caption, fontWeight: '600' },
});
