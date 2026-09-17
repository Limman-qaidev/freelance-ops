import { useState } from 'react';
import { Pressable } from 'react-native';

import { AppIcon, type AppIconName } from '@/ui/components/app-icon';
import { useTheme } from '@/ui/theme/use-theme';

type IconButtonProps = {
  icon: AppIconName;
  accessibilityLabel: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
};

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  selected = false,
  disabled = false,
}: IconButtonProps) {
  const { theme } = useTheme();
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        {
          minHeight: theme.sizing.iconButtonTarget,
          minWidth: theme.sizing.iconButtonTarget,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radii.md,
        },
        {
          backgroundColor: selected
            ? theme.colors.accentSoft
            : pressed
              ? theme.colors.surfaceMuted
              : 'transparent',
        },
      ]}
    >
      <AppIcon
        name={icon}
        size={theme.sizing.inlineIcon}
        color={disabled ? theme.colors.disabledText : selected ? theme.colors.accent : theme.colors.textSecondary}
      />
    </Pressable>
  );
}
