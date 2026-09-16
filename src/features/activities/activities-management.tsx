import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Activity } from '@/domain/activities/activity';
import { useApplication } from '@/providers/application-context';
import { colors, radii, spacing, typography } from '@/ui/theme/tokens';

export function ActivitiesManagement() {
  const { activityService } = useApplication();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setActivities(await activityService.listActive());
  }, [activityService]);

  useEffect(() => {
    let active = true;
    void activityService.listActive().then((nextActivities) => {
      if (active) setActivities(nextActivities);
    });
    return () => {
      active = false;
    };
  }, [activityService]);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (editingId) {
      await activityService.update({ id: editingId, name: trimmed });
    } else {
      await activityService.create({ name: trimmed });
    }
    reset();
    await load();
  }

  function edit(activity: Activity) {
    setEditingId(activity.id);
    setName(activity.name);
  }

  function reset() {
    setEditingId(null);
    setName('');
  }

  async function archive(id: string) {
    await activityService.archive(id);
    if (editingId === id) reset();
    await load();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Activities</Text>
      <Text style={styles.description}>
        Activities classify the kind of work performed independently of project and task.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Activity name"
        value={name}
        onChangeText={setName}
      />
      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={() => void submit()}>
          <Text style={styles.primaryText}>{editingId ? 'Save activity' : 'Add activity'}</Text>
        </Pressable>
        {editingId ? (
          <Pressable style={styles.secondaryButton} onPress={reset}>
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
        ) : null}
      </View>
      {activities.map((activity) => (
        <View key={activity.id} style={styles.card}>
          <Text style={styles.cardTitle}>{activity.name}</Text>
          <View style={styles.actions}>
            <Pressable
              style={styles.secondaryButton}
              accessibilityLabel={`Edit activity ${activity.name}`}
              onPress={() => edit(activity)}
            >
              <Text style={styles.secondaryText}>Edit</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              accessibilityLabel={`Archive activity ${activity.name}`}
              onPress={() => void archive(activity.id)}
            >
              <Text style={styles.secondaryText}>Archive</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  title: { color: colors.textPrimary, fontSize: typography.sectionTitle, fontWeight: '700' },
  description: { color: colors.textMuted, fontSize: typography.caption, lineHeight: 18 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, color: colors.textPrimary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.body },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  primaryButton: { backgroundColor: colors.accent, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  primaryText: { color: colors.surface, fontWeight: '700' },
  secondaryButton: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  secondaryText: { color: colors.textPrimary, fontWeight: '600' },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  cardTitle: { color: colors.textPrimary, fontSize: typography.body, fontWeight: '700' },
});
