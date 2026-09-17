import { Pressable, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/ui/components/app-icon';
import { useTheme } from '@/ui/theme/use-theme';

type ProjectRowProps = {
  projectName: string;
  clientName: string;
  statusLabel?: string;
  metadata?: string;
  accessibilityLabel: string;
  onPress: () => void;
  trailingIcon?: AppIconName;
};

export function ProjectRow({
  projectName,
  clientName,
  statusLabel,
  metadata,
  accessibilityLabel,
  onPress,
  trailingIcon = 'chevronRight',
}: ProjectRowProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: theme.sizing.projectRowMinHeight,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: 14,
        borderRadius: theme.radii.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
      })}
    >
      <View style={{ flex: 1 }}>
        <Text numberOfLines={2} style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>
          {projectName}
        </Text>
        <Text numberOfLines={1} style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>
          {clientName}
        </Text>
        {statusLabel || metadata ? (
          <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted, marginTop: theme.spacing.xs }}>
            {[statusLabel, metadata].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>
      <AppIcon name={trailingIcon} size={theme.sizing.inlineIcon} color={theme.colors.accent} />
    </Pressable>
  );
}
