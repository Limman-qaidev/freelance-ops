import type { ComponentProps } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AppIcon } from '@/ui/components/app-icon';
import { useTheme } from '@/ui/theme/use-theme';

type TextFieldProps = ComponentProps<typeof TextInput> & { label: string; helperText?: string };

export function TextField({ label, helperText, multiline, style, ...props }: TextFieldProps) {
  const { theme } = useTheme();
  return <View style={{ gap: theme.spacing.xs }}><Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>{label}</Text><TextInput {...props} multiline={multiline} placeholderTextColor={theme.colors.textMuted} style={[{ minHeight: multiline ? 96 : 48, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.surface, color: theme.colors.textPrimary, paddingHorizontal: 14, paddingVertical: theme.spacing.md, textAlignVertical: multiline ? 'top' : 'center', ...theme.typography.body }, style]} />{helperText ? <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>{helperText}</Text> : null}</View>;
}

export function SelectionRow({ label, value, onPress, accessibilityLabel, optional = false }: { label: string; value: string; onPress: () => void; accessibilityLabel?: string; optional?: boolean }) {
  const { theme } = useTheme();
  const resolvedLabel = optional ? label + ' (optional)' : label;
  return <View style={{ gap: theme.spacing.xs }}><Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>{resolvedLabel}</Text><Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} onPress={onPress} style={({ pressed }) => ({ minHeight: 52, paddingHorizontal: 14, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm })}><Text style={{ flex: 1, ...theme.typography.body, color: theme.colors.textPrimary }}>{value}</Text><AppIcon name="chevronRight" size={20} color={theme.colors.textMuted} /></Pressable></View>;
}
