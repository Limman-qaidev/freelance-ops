import { Tabs } from 'expo-router';
import { useContext } from 'react';

import { useUiCopy } from '@/i18n/use-ui-copy';
import { AppIcon, type AppIconName } from '@/ui/components/app-icon';
import { lightTheme } from '@/ui/theme/theme';
import { ThemeContext } from '@/ui/theme/theme-provider';

const TAB_ICONS: Record<string, AppIconName> = {
  index: 'today',
  projects: 'projects',
  tasks: 'tasks',
  planning: 'planning',
  more: 'more',
};

export default function TabLayout() {
  const theme = useContext(ThemeContext)?.theme ?? lightTheme;
  const { t } = useUiCopy();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 64,
          paddingTop: 6,
          paddingBottom: 6,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          elevation: 8,
        },
        tabBarLabelStyle: {
          ...theme.typography.micro,
        },
        tabBarIcon: ({ color, size }) => {
          const icon = TAB_ICONS[route.name];
          return icon ? <AppIcon name={icon} size={size} color={color} /> : null;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: t('nav.today') }} />
      <Tabs.Screen name="projects" options={{ title: t('nav.projects') }} />
      <Tabs.Screen name="tasks" options={{ title: t('nav.tasks') }} />
      <Tabs.Screen name="planning" options={{ title: t('nav.planning') }} />
      <Tabs.Screen name="more" options={{ title: t('nav.more') }} />
      <Tabs.Screen name="start-work" options={{ href: null }} />
    </Tabs>
  );
}
