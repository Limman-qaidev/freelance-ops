import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivitiesManagement } from '@/features/activities/activities-management';
import { useI18n } from '@/i18n/use-i18n';
import { ActionButton } from '@/ui/components/action-button';
import { AppIcon, type AppIconName } from '@/ui/components/app-icon';
import { ScreenShell } from '@/ui/components/screen-shell';
import { SectionHeader } from '@/ui/components/section-header';
import { useTheme } from '@/ui/theme/use-theme';

type SettingsRowProps = {
  label: string;
  detail: string;
  icon: AppIconName;
  onPress: () => void;
};

function SettingsRow({ label, detail, icon, onPress }: SettingsRowProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={{ text: detail }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 64, paddingHorizontal: 14, paddingVertical: theme.spacing.sm,
        flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
        borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md,
        backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
      })}
    >
      <AppIcon name={icon} color={theme.colors.accent} />
      <View style={{ flex: 1 }}>
        <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>{label}</Text>
        <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>{detail}</Text>
      </View>
      <AppIcon name="chevronRight" color={theme.colors.textMuted} />
    </Pressable>
  );
}

type PreferenceChoice = {
  label: string;
  selected: boolean;
  save: () => Promise<void>;
};

export default function MoreScreen() {
  const { theme, preference, setThemePreference } = useTheme();
  const { languageOverride, setLanguage, t } = useI18n();
  const [chooser, setChooser] = useState<'language' | 'appearance' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const saveInFlight = useRef(false);

  const languageLabel = t(languageOverride === null
    ? 'settings.languageAutomatic'
    : languageOverride === 'es' ? 'settings.languageSpanish' : 'settings.languageEnglish');
  const themeLabel = t(preference === 'system'
    ? 'settings.themeSystem'
    : preference === 'light' ? 'settings.themeLight' : 'settings.themeDark');
  const choices: PreferenceChoice[] = chooser === 'language' ? [
    { label: t('settings.languageAutomatic'), selected: languageOverride === null, save: () => setLanguage(null) },
    { label: t('settings.languageSpanish'), selected: languageOverride === 'es', save: () => setLanguage('es') },
    { label: t('settings.languageEnglish'), selected: languageOverride === 'en', save: () => setLanguage('en') },
  ] : [
    { label: t('settings.themeSystem'), selected: preference === 'system', save: () => setThemePreference('system') },
    { label: t('settings.themeLight'), selected: preference === 'light', save: () => setThemePreference('light') },
    { label: t('settings.themeDark'), selected: preference === 'dark', save: () => setThemePreference('dark') },
  ];

  function openChooser(next: 'language' | 'appearance') {
    setSaveFailed(false);
    setChooser(next);
  }

  function closeChooser() {
    if (!saveInFlight.current) setChooser(null);
  }

  async function selectChoice(choice: PreferenceChoice) {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    setSaving(true);
    setSaveFailed(false);
    try {
      await choice.save();
      setChooser(null);
    } catch {
      setSaveFailed(true);
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <ScreenShell title={t('nav.more')} subtitle={t('common.settings')}>
      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: theme.spacing.sm }}>
          <SectionHeader title={t('more.workRecords')} />
          <SettingsRow label={t('more.timeHistory')} detail={t('more.timeHistoryDetail')} icon="manualTime" onPress={() => router.push('/time-history' as never)} />
          <SettingsRow label={t('common.addManualTime')} detail={t('more.manualDetail')} icon="manualTime" onPress={() => router.push('/time-entry/new' as never)} />
          <SettingsRow label={t('more.expenses')} detail={t('more.expensesDetail')} icon="expense" onPress={() => router.push('/expenses' as never)} />
        </View>
        <View style={{ gap: theme.spacing.sm }}>
          <SectionHeader title={t('more.preferences')} />
          <SettingsRow label={t('settings.language')} detail={languageLabel} icon="more" onPress={() => openChooser('language')} />
          <SettingsRow label={t('more.appearance')} detail={themeLabel} icon="settings" onPress={() => openChooser('appearance')} />
        </View>
        <ActivitiesManagement />
      </ScrollView>
      <Modal
        visible={chooser !== null}
        transparent
        animationType="fade"
        onRequestClose={closeChooser}
      >
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.colors.scrim, padding: theme.spacing.lg }}>
          <View
            accessibilityViewIsModal
            style={{ maxHeight: '90%', padding: theme.spacing.lg, borderRadius: theme.radii.lg, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, gap: theme.spacing.md }}
          >
            <Text accessibilityRole="header" style={{ ...theme.typography.section, color: theme.colors.textPrimary }}>
              {t(chooser === 'language' ? 'settings.language' : 'more.appearance')}
            </Text>
            <ScrollView contentContainerStyle={{ gap: theme.spacing.sm }}>
              {choices.map((choice) => (
                <Pressable
                  key={choice.label}
                  accessibilityRole="radio"
                  accessibilityLabel={choice.label}
                  accessibilityState={{ checked: choice.selected, disabled: saving }}
                  disabled={saving}
                  onPress={() => void selectChoice(choice)}
                  style={({ pressed }) => ({
                    minHeight: 48, padding: theme.spacing.md, borderRadius: theme.radii.md,
                    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
                    borderWidth: 1, borderColor: choice.selected ? theme.colors.accent : theme.colors.border,
                    backgroundColor: pressed ? theme.colors.surfaceMuted : choice.selected ? theme.colors.accentSoft : theme.colors.surface,
                  })}
                >
                  <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: choice.selected ? theme.colors.accent : theme.colors.textMuted, alignItems: 'center', justifyContent: 'center' }}>
                    {choice.selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.accent }} /> : null}
                  </View>
                  <Text style={{ flex: 1, ...theme.typography.body, color: theme.colors.textPrimary }}>{choice.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {saveFailed ? <Text accessibilityRole="alert" style={{ ...theme.typography.caption, color: theme.colors.error }}>{t('more.preferenceError')}</Text> : null}
            <ActionButton label={t('more.cancel')} variant="secondary" onPress={closeChooser} disabled={saving} />
          </View>
        </SafeAreaView>
      </Modal>
    </ScreenShell>
  );
}
