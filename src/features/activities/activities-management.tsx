import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import type { Activity } from '@/domain/activities/activity';
import type { TranslationKey } from '@/i18n/translations';
import { useI18n } from '@/i18n/use-i18n';
import { useApplication } from '@/providers/application-context';
import { ActionButton } from '@/ui/components/action-button';
import { TextField } from '@/ui/components/form-fields';
import { SectionHeader } from '@/ui/components/section-header';
import { useTheme } from '@/ui/theme/use-theme';

export function ActivitiesManagement() {
  const { activityService } = useApplication();
  const { theme } = useTheme();
  const { t } = useI18n();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const mutationInFlight = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setActivities(await activityService.listActive());
    } catch {
      setError('activities.loadError');
    } finally {
      setLoading(false);
    }
  }, [activityService]);

  useEffect(() => {
    let active = true;
    void activityService.listActive().then(
      (items) => {
        if (active) { setActivities(items); setLoading(false); }
      },
      () => {
        if (active) { setError('activities.loadError'); setLoading(false); }
      },
    );
    return () => { active = false; };
  }, [activityService]);

  function reset() {
    setEditingId(null);
    setName('');
  }

  async function mutate(action: () => Promise<void>, failure: TranslationKey) {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch {
      setError(failure);
    } finally {
      mutationInFlight.current = false;
      setBusy(false);
    }
  }

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    void mutate(async () => {
      if (editingId) await activityService.update({ id: editingId, name: trimmed });
      else await activityService.create({ name: trimmed });
      reset();
    }, 'activities.saveError');
  }

  function archive(id: string) {
    void mutate(async () => {
      await activityService.archive(id);
      if (editingId === id) reset();
    }, 'activities.archiveError');
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title={t('more.activities')} />
      <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
        {t('activities.description')}
      </Text>
      <TextField
        label={t('activities.name')}
        accessibilityLabel={t('activities.name')}
        placeholder={t('activities.name')}
        value={name}
        onChangeText={setName}
        editable={!busy}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        <ActionButton label={t(editingId ? 'activities.save' : 'activities.add')} onPress={submit} disabled={busy || !name.trim()} />
        {editingId ? <ActionButton label={t('more.cancel')} variant="secondary" onPress={reset} disabled={busy} /> : null}
      </View>
      {loading ? <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>{t('activities.loading')}</Text> : null}
      {error ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Text accessibilityRole="alert" style={{ ...theme.typography.caption, color: theme.colors.error }}>{t(error)}</Text>
          {error === 'activities.loadError' ? <ActionButton label={t('activities.retry')} variant="secondary" onPress={() => void load()} disabled={busy || loading} /> : null}
        </View>
      ) : !loading && !activities.length ? (
        <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>{t('activities.empty')}</Text>
      ) : null}
      {activities.map((activity) => (
        <View key={activity.id} style={{
          padding: theme.spacing.md, gap: theme.spacing.sm,
          borderWidth: 1, borderColor: theme.colors.border,
          borderRadius: theme.radii.md, backgroundColor: theme.colors.surface,
        }}>
          <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>{activity.name}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <ActionButton
              label={t('activities.edit')}
              accessibilityLabel={t('activities.editLabel') + ' ' + activity.name}
              variant="secondary"
              disabled={busy}
              onPress={() => { setEditingId(activity.id); setName(activity.name); setError(null); }}
            />
            <ActionButton
              label={t('activities.archive')}
              accessibilityLabel={t('activities.archiveLabel') + ' ' + activity.name}
              variant="danger"
              disabled={busy}
              onPress={() => archive(activity.id)}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
