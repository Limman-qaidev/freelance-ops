import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/ui/theme/use-theme';

type ScreenShellProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

export function ScreenShell({ title, subtitle, children }: ScreenShellProps) {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <View style={{ flex: 1, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md }}>
        <Text style={{ ...theme.typography.title, color: theme.colors.textPrimary }}>{title}</Text>
        {subtitle ? (
          <Text
            style={{
              ...theme.typography.body,
              color: theme.colors.textSecondary,
              marginTop: theme.spacing.xs,
              marginBottom: theme.spacing.lg,
            }}
          >
            {subtitle}
          </Text>
        ) : (
          <View style={{ height: theme.spacing.lg }} />
        )}
        {children}
      </View>
    </SafeAreaView>
  );
}
