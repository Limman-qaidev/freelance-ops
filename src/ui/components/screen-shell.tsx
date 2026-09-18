import { type ReactNode, useContext } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { lightTheme } from '@/ui/theme/theme';
import { ThemeContext } from '@/ui/theme/theme-provider';

type ScreenShellProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

export function ScreenShell({ title, subtitle, children }: ScreenShellProps) {
  const theme = useContext(ThemeContext)?.theme ?? lightTheme;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.md,
        }}
      >
        <View
          testID="screen-shell-header"
          style={{
            minHeight: 52,
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...theme.typography.title, color: theme.colors.textPrimary }}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{
                ...theme.typography.caption,
                color: theme.colors.textSecondary,
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View testID="screen-shell-content" style={{ flex: 1, marginTop: theme.spacing.md }}>
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}
