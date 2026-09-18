import { Text, View } from 'react-native';
import { AppIcon, type AppIconName } from '@/ui/components/app-icon';
import { useTheme } from '@/ui/theme/use-theme';

export function StatusPill({ label, tone = 'neutral', icon }: { label: string; tone?: 'neutral' | 'accent' | 'success' | 'warning'; icon?: AppIconName }) {
  const { theme } = useTheme();
  const color = tone === 'accent' ? theme.colors.accent : tone === 'success' ? theme.colors.success : tone === 'warning' ? theme.colors.warning : theme.colors.textSecondary;
  return <View style={{ minHeight: 24, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: theme.spacing.sm, borderRadius: 12, backgroundColor: tone === 'accent' ? theme.colors.accentSoft : theme.colors.surfaceMuted }}>{icon ? <AppIcon name={icon} size={14} color={color} /> : null}<Text style={{ ...theme.typography.micro, color }}>{label}</Text></View>;
}
