import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/ui/components/app-icon';
import { useTheme } from '@/ui/theme/use-theme';

type SelectionFieldProps = {
  label: string;
  value: string;
  accessibilityLabel?: string;
  onPress: () => void;
};

export function SelectionField({
  label,
  value,
  accessibilityLabel,
  onPress,
}: SelectionFieldProps) {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text style={{ ...theme.typography.caption, color: theme.colors.textPrimary, fontWeight: '600' }}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 48,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.sm,
          paddingHorizontal: theme.spacing.md,
          backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
        })}
      >
        <Text
          numberOfLines={1}
          style={{ ...theme.typography.body, color: theme.colors.textSecondary, flex: 1 }}
        >
          {value}
        </Text>
        <AppIcon name="chevronDown" size={18} color={theme.colors.textMuted} />
      </Pressable>
    </View>
  );
}
