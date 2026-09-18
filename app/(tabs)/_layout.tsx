import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUiCopy } from '@/i18n/use-ui-copy';
import { AppIcon, type AppIconName } from '@/ui/components/app-icon';
import { useTheme } from '@/ui/theme/use-theme';
function TabIcon({ name, color }: { name: AppIconName; color: ColorValue }) { return <AppIcon name={name} size={22} color={color} />; }
function TodayIcon({ color }: { color: ColorValue }) { return <TabIcon name="today" color={color} />; }
function ProjectsIcon({ color }: { color: ColorValue }) { return <TabIcon name="projects" color={color} />; }
function TasksIcon({ color }: { color: ColorValue }) { return <TabIcon name="tasks" color={color} />; }
function PlanningIcon({ color }: { color: ColorValue }) { return <TabIcon name="planning" color={color} />; }
function MoreIcon({ color }: { color: ColorValue }) { return <TabIcon name="more" color={color} />; }
export default function TabLayout() { const t = useUiCopy(); const { theme } = useTheme(); const insets = useSafeAreaInsets(); return <Tabs screenOptions={{ headerShown: false, tabBarStyle: { height: 60 + insets.bottom, paddingBottom: insets.bottom, backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }, tabBarActiveTintColor: theme.colors.accent, tabBarInactiveTintColor: theme.colors.textMuted, tabBarLabelStyle: { ...theme.typography.micro } }}><Tabs.Screen name="index" options={{ title: t('nav.today', 'Today'), tabBarIcon: TodayIcon }} /><Tabs.Screen name="projects" options={{ title: t('nav.projects', 'Projects'), tabBarIcon: ProjectsIcon }} /><Tabs.Screen name="tasks" options={{ title: t('nav.tasks', 'Tasks'), tabBarIcon: TasksIcon }} /><Tabs.Screen name="planning" options={{ title: t('nav.planning', 'Planning'), tabBarIcon: PlanningIcon }} /><Tabs.Screen name="more" options={{ title: t('nav.more', 'More'), tabBarIcon: MoreIcon }} /></Tabs>; }