import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { calculateExpenseAmounts } from '@/application/expenses/expense-money';
import type { PreparedExpenseAttachment } from '@/domain/expenses/expense';
import type { Project } from '@/domain/projects/project';
import { useApplication } from '@/providers/application-context';
import { ScreenShell } from '@/ui/components/screen-shell';
import { colors, radii, spacing, typography } from '@/ui/theme/tokens';

export default function ExpenseEditorScreen() {
  const params = useLocalSearchParams<{ id?: string; projectId?: string }>();
  const { expenseService, projectService } = useApplication();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(params.projectId ?? '');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [originalCurrency, setOriginalCurrency] = useState('EUR');
  const [exchangeRateDecimal, setExchangeRateDecimal] = useState('');
  const [reimbursable, setReimbursable] = useState(false);
  const [billable, setBillable] = useState(false);
  const [existingAttachmentNames, setExistingAttachmentNames] = useState<string[]>([]);
  const [preparedReceipts, setPreparedReceipts] = useState<PreparedExpenseAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    void projectService
      .listActiveProjects()
      .then((nextProjects) => {
        if (!mounted) return;
        setProjects(nextProjects);
        if (!projectId && nextProjects[0]) setProjectId(nextProjects[0].id);
      })
      .catch(() => {
        if (mounted) setError('Unable to load projects.');
      });
    return () => {
      mounted = false;
    };
  }, [projectId, projectService]);

  useEffect(() => {
    if (!params.id) return;
    let mounted = true;
    void expenseService
      .getById(params.id)
      .then((record) => {
        if (!mounted || !record) return;
        const expense = record.expense;
        setProjectId(expense.projectId);
        setExpenseDate(expense.expenseDate);
        setCategory(expense.category);
        setDescription(expense.description ?? '');
        setOriginalAmount(formatMinor(expense.originalAmountMinor));
        setOriginalCurrency(expense.originalCurrency);
        setExchangeRateDecimal(expense.exchangeRateDecimal === '1' ? '' : expense.exchangeRateDecimal);
        setReimbursable(expense.reimbursable);
        setBillable(expense.billable ?? false);
        setExistingAttachmentNames(record.attachments.map((attachment) => attachment.originalFilename));
      })
      .catch(() => {
        if (mounted) setError('Unable to load this expense.');
      });
    return () => {
      mounted = false;
    };
  }, [expenseService, params.id]);

  const selectedProject = projects.find((project) => project.id === projectId) ?? null;
  const preview = useMemo(() => {
    if (!selectedProject || !originalAmount.trim() || !originalCurrency.trim()) return null;
    try {
      return calculateExpenseAmounts({
        originalAmount,
        originalCurrency,
        projectCurrency: selectedProject.projectCurrency,
        exchangeRateDecimal: exchangeRateDecimal.trim() || null,
      });
    } catch {
      return null;
    }
  }, [exchangeRateDecimal, originalAmount, originalCurrency, selectedProject]);

  async function attachReceipt() {
    setError(null);
    try {
      const receipt = await expenseService.prepareReceipt();
      if (receipt) setPreparedReceipts((current) => [...current, receipt]);
    } catch {
      setError('Unable to attach that receipt.');
    }
  }

  async function save() {
    if (!projectId) {
      setError('Choose a project before saving.');
      return;
    }
    setSaving(true);
    setError(null);
    const input = {
      projectId,
      expenseDate,
      category,
      description,
      originalAmount,
      originalCurrency,
      exchangeRateDecimal: exchangeRateDecimal.trim() || null,
      reimbursable,
      billable,
    };
    try {
      if (params.id) {
        await expenseService.update(params.id, input);
        for (const receipt of preparedReceipts) {
          await expenseService.addPreparedReceipt(params.id, receipt);
        }
      } else {
        const receiptArgument =
          preparedReceipts.length === 0
            ? undefined
            : preparedReceipts.length === 1
              ? preparedReceipts[0]
              : preparedReceipts;
        await expenseService.create(input, receiptArgument);
      }
      setPreparedReceipts([]);
      router.replace('/expenses' as never);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save expense.');
    } finally {
      setSaving(false);
    }
  }

  async function removeUnsavedReceipt(receipt: PreparedExpenseAttachment) {
    await expenseService.discardPreparedReceipt(receipt).catch(() => undefined);
    setPreparedReceipts((current) => current.filter((item) => item.id !== receipt.id));
  }

  return (
    <ScreenShell
      title={params.id ? 'Edit expense' : 'New expense'}
      subtitle="Capture the cost locally and keep receipts with the project record."
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Project</Text>
        <View style={styles.chips}>
          {projects.map((project) => (
            <Pressable
              key={project.id}
              style={[styles.chip, project.id === projectId && styles.chipSelected]}
              onPress={() => setProjectId(project.id)}
            >
              <Text style={[styles.chipText, project.id === projectId && styles.chipTextSelected]}>
                {project.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput accessibilityLabel="Expense date" style={styles.input} value={expenseDate} onChangeText={setExpenseDate} placeholder="YYYY-MM-DD" />
        <TextInput accessibilityLabel="Expense category" style={styles.input} value={category} onChangeText={setCategory} placeholder="Category" />
        <TextInput accessibilityLabel="Expense amount" style={styles.input} value={originalAmount} onChangeText={setOriginalAmount} placeholder="Amount" keyboardType="decimal-pad" />
        <TextInput accessibilityLabel="Expense currency" style={styles.input} value={originalCurrency} onChangeText={(value) => setOriginalCurrency(value.toUpperCase())} placeholder="Currency" autoCapitalize="characters" />
        {selectedProject && originalCurrency.trim().toUpperCase() !== selectedProject.projectCurrency ? (
          <TextInput accessibilityLabel="Exchange rate" style={styles.input} value={exchangeRateDecimal} onChangeText={setExchangeRateDecimal} placeholder={`1 ${originalCurrency || 'CUR'} = ? ${selectedProject.projectCurrency}`} keyboardType="decimal-pad" />
        ) : null}
        <TextInput accessibilityLabel="Expense description" style={styles.input} value={description} onChangeText={setDescription} placeholder="Description (optional)" multiline />

        {preview ? (
          <View style={styles.preview}>
            <Text style={styles.previewText}>
              Project amount: {formatMinor(preview.projectAmountMinor)} {preview.projectCurrency}
            </Text>
          </View>
        ) : null}

        <View style={styles.toggleRow}>
          <Pressable accessibilityLabel="Set reimbursable" style={[styles.toggle, reimbursable && styles.toggleSelected]} onPress={() => setReimbursable((value) => !value)}>
            <Text style={[styles.toggleText, reimbursable && styles.toggleTextSelected]}>{reimbursable ? 'Reimbursable' : 'Not reimbursable'}</Text>
          </Pressable>
          <Pressable accessibilityLabel="Set billable" style={[styles.toggle, billable && styles.toggleSelected]} onPress={() => setBillable((value) => !value)}>
            <Text style={[styles.toggleText, billable && styles.toggleTextSelected]}>{billable ? 'Billable' : 'Non-billable'}</Text>
          </Pressable>
        </View>

        <Pressable accessibilityLabel="Attach receipt" style={styles.secondaryButton} onPress={() => void attachReceipt()}>
          <Text style={styles.secondaryText}>Attach receipt / document</Text>
        </Pressable>

        {[...existingAttachmentNames, ...preparedReceipts.map((receipt) => receipt.originalFilename)].map((name, index) => (
          <Text key={`${name}-${index}`} style={styles.attachmentName}>{name}</Text>
        ))}
        {preparedReceipts.map((receipt) => (
          <Pressable key={`remove-${receipt.id}`} onPress={() => void removeUnsavedReceipt(receipt)}>
            <Text style={styles.removeText}>Remove {receipt.originalFilename}</Text>
          </Pressable>
        ))}

        <View style={styles.actions}>
          <Pressable accessibilityLabel="Save expense" disabled={saving} style={styles.primaryButton} onPress={() => void save()}>
            <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save expense'}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

function formatMinor(value: number): string {
  return (value / 100).toFixed(2);
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm, paddingBottom: spacing.xl },
  label: { color: colors.textMuted, fontSize: typography.caption, fontWeight: '600' },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, color: colors.textPrimary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.body },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textPrimary, fontSize: typography.caption },
  chipTextSelected: { color: colors.surface, fontWeight: '700' },
  preview: { backgroundColor: '#EFF6FF', borderRadius: radii.md, padding: spacing.md },
  previewText: { color: colors.textPrimary, fontSize: typography.body, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  toggle: { borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  toggleSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  toggleText: { color: colors.textPrimary, fontSize: typography.caption },
  toggleTextSelected: { color: colors.surface, fontWeight: '700' },
  attachmentName: { color: colors.textPrimary, fontSize: typography.caption },
  removeText: { color: '#B91C1C', fontSize: typography.caption, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  primaryButton: { backgroundColor: colors.accent, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  primaryText: { color: colors.surface, fontWeight: '700' },
  secondaryButton: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  secondaryText: { color: colors.textPrimary, fontWeight: '600' },
  error: { color: '#B91C1C', fontSize: typography.caption, fontWeight: '600' },
});
