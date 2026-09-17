import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/ui/theme/use-theme';

type SectionHeaderProps = {
  title: string;
  metadata?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeader({ title, metadata, actionLabel, onActionPress }: SectionHeaderProps) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        minHeight: 32,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.sm,
      }}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm }}>
        <Text style={{ ...theme.typography.section, color: theme.colors.textPrimary }}>{title}</Text>
        {metadata ? (
          <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>{metadata}</Text>
        ) : null}
      </View>
      {actionLabel && onActionPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onActionPress}
          style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: theme.spacing.sm }}
        >
          <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.accent }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
