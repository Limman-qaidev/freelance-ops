import { Text, View } from 'react-native';

import { IconButton } from '@/ui/components/icon-button';
import type { AppIconName } from '@/ui/components/app-icon';
import { useTheme } from '@/ui/theme/use-theme';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  actionIcon?: AppIconName;
  actionAccessibilityLabel?: string;
  onActionPress?: () => void;
};

export function AppHeader({
  title,
  subtitle,
  actionIcon,
  actionAccessibilityLabel,
  onActionPress,
}: AppHeaderProps) {
  const { theme } = useTheme();
  const showAction = actionIcon && actionAccessibilityLabel && onActionPress;

  return (
    <View
      style={{
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ ...theme.typography.title, color: theme.colors.textPrimary }}>{title}</Text>
        {subtitle ? (
          <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {showAction ? (
        <IconButton
          icon={actionIcon}
          accessibilityLabel={actionAccessibilityLabel}
          onPress={onActionPress}
        />
      ) : null}
    </View>
  );
}
