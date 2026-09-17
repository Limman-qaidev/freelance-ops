import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useI18n } from '@/i18n/use-i18n';
import { AppIcon, type AppIconName } from '@/ui/components/app-icon';
import { useTheme } from '@/ui/theme/use-theme';

export default function TabLayout() {
  const { t } = useI18n();
  const { theme } = useTheme();

  const tab = (title: string, icon: AppIconName) => ({
    title,
    tabBarLabel: title,
    tabBarIcon: ({ color }: { color: ColorValue }) => (
      <AppIcon
        name={icon}
        size={theme.sizing.bottomIcon}
        color={typeof color === 'string' ? color : theme.colors.textMuted}
      />
    ),
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          minHeight: 60,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: theme.typography.micro,
        tabBarItemStyle: {
          paddingTop: theme.spacing.xs,
          paddingBottom: theme.spacing.xs,
        },
      }}
    >
      <Tabs.Screen name="index" options={tab(t('nav.today'), 'today')} />
      <Tabs.Screen name="projects" options={tab(t('nav.projects'), 'projects')} />
      <Tabs.Screen name="tasks" options={tab(t('nav.tasks'), 'tasks')} />
      <Tabs.Screen name="planning" options={tab(t('nav.planning'), 'planning')} />
      <Tabs.Screen name="more" options={tab(t('nav.more'), 'more')} />
    </Tabs>
  );
}
