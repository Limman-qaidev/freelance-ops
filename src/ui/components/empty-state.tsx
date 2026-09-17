import { Text, View } from 'react-native';

import { ActionButton } from '@/ui/components/action-button';
import { AppIcon, type AppIconName } from '@/ui/components/app-icon';
import { useTheme } from '@/ui/theme/use-theme';

type EmptyStateProps = {
  title: string;
  body: string;
  actionLabel?: string;
  onActionPress?: () => void;
  icon?: AppIconName;
};

export function EmptyState({
  title,
  body,
  actionLabel,
  onActionPress,
  icon = 'projects',
}: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        padding: theme.spacing.lg,
        borderRadius: theme.radii.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        gap: theme.spacing.sm,
      }}
    >
      <AppIcon name={icon} size={24} color={theme.colors.textSecondary} />
      <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>{title}</Text>
      <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>{body}</Text>
      {actionLabel && onActionPress ? (
        <View style={{ marginTop: theme.spacing.xs, alignSelf: 'flex-start' }}>
          <ActionButton label={actionLabel} accessibilityLabel={actionLabel} onPress={onActionPress} />
        </View>
      ) : null}
    </View>
  );
}
