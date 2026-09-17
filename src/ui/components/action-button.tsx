import { useContext } from 'react';
import { Pressable, Text } from 'react-native';

import { lightTheme } from '@/ui/theme/theme';
import { ThemeContext } from '@/ui/theme/theme-provider';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export function ActionButton({
  label,
  onPress,
  accessibilityLabel,
  variant = 'primary',
  disabled = false,
}: ActionButtonProps) {
  const theme = useContext(ThemeContext)?.theme ?? lightTheme;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => {
        const backgroundColor = disabled
          ? theme.colors.disabledSurface
          : variant === 'primary'
            ? pressed
              ? theme.colors.accentPressed
              : theme.colors.accent
            : pressed
              ? theme.colors.surfaceMuted
              : theme.colors.surface;
        const borderColor = disabled
          ? theme.colors.border
          : variant === 'danger'
            ? theme.colors.error
            : variant === 'secondary'
              ? theme.colors.borderStrong
              : 'transparent';

        return {
          minHeight: theme.sizing.buttonHeight,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radii.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor,
          borderWidth: variant === 'primary' ? 0 : 1,
          borderColor,
        };
      }}
    >
      <Text
        style={{
          ...theme.typography.bodyStrong,
          color: disabled
            ? theme.colors.disabledText
            : variant === 'primary'
              ? theme.colors.onAccent
              : variant === 'danger'
                ? theme.colors.error
                : theme.colors.textPrimary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
