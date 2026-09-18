import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ActivitiesManagement } from '@/features/activities/activities-management';
import { useI18n } from '@/i18n/use-i18n';
import { AppIcon, type AppIconName } from '@/ui/components/app-icon';
import { ScreenShell } from '@/ui/components/screen-shell';
import { SectionHeader } from '@/ui/components/section-header';
import { useTheme } from '@/ui/theme/use-theme';

function SettingsRow({ label, detail, icon, onPress }: { label: string; detail: string; icon: AppIconName; onPress: () => void }) {
  const { theme } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ minHeight: 64, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface })}><AppIcon name={icon} color={theme.colors.accent} /><View style={{ flex: 1 }}><Text style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>{label}</Text><Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>{detail}</Text></View><AppIcon name="chevronRight" color={theme.colors.textMuted} /></Pressable>;
}

export default function MoreScreen() {
  const { theme, preference, resolved, setThemePreference } = useTheme();
  const { language, languageOverride, setLanguage, t } = useI18n();
  const nextLanguage = languageOverride === null ? 'es' : languageOverride === 'es' ? 'en' : null;
  const nextTheme = preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system';
  const languageLabel = languageOverride === null ? `Automatic (${language})` : languageOverride === 'es' ? 'Español' : 'English';
  const themeLabel = preference === 'system' ? `System (${resolved})` : preference[0].toUpperCase() + preference.slice(1);
  return <ScreenShell title={t('nav.more')} subtitle={t('common.settings')}><ScrollView contentContainerStyle={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}><View style={{ gap: theme.spacing.sm }}><SectionHeader title={t('more.workRecords')} /><SettingsRow label={t('more.timeHistory')} detail={t('more.timeHistoryDetail')} icon="manualTime" onPress={() => router.push('/time-history' as never)} /><SettingsRow label={t('common.addManualTime')} detail={t('more.manualDetail')} icon="manualTime" onPress={() => router.push('/time-entry/new' as never)} /><SettingsRow label={t('more.expenses')} detail={t('more.expensesDetail')} icon="expense" onPress={() => router.push('/expenses' as never)} /></View><View style={{ gap: theme.spacing.sm }}><SectionHeader title={t('more.preferences')} /><SettingsRow label={t('settings.language')} detail={languageLabel} icon="more" onPress={() => void setLanguage(nextLanguage)} /><SettingsRow label={t('more.appearance')} detail={themeLabel} icon="settings" onPress={() => void setThemePreference(nextTheme)} /></View><View style={{ gap: theme.spacing.sm }}><SectionHeader title={t('more.activities')} /><ActivitiesManagement /></View></ScrollView></ScreenShell>;
}