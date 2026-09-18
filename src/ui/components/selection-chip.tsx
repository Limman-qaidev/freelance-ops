import { Pressable, Text } from 'react-native';

import { useTheme } from '@/ui/theme/use-theme';

type SelectionChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
};

export function SelectionChip({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: SelectionChipProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        justifyContent: 'center',
        borderColor: selected ? theme.colors.accent : theme.colors.border,
        borderWidth: 1,
        borderRadius: theme.radii.lg,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: pressed
          ? theme.colors.surfaceMuted
          : selected
            ? theme.colors.accentSoft
            : theme.colors.surface,
      })}
    >
      <Text
        style={{
          ...theme.typography.caption,
          fontWeight: '600',
          color: selected ? theme.colors.accent : theme.colors.textPrimary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
