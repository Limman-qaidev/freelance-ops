import { Text, View } from 'react-native';

import { ActionButton } from '@/ui/components/action-button';
import { AppIcon } from '@/ui/components/app-icon';
import { useTheme } from '@/ui/theme/use-theme';

type ActiveTimerCardProps = {
  projectName: string;
  context?: string;
  elapsed: string;
  status: 'running' | 'paused';
  statusLabel: string;
  pauseLabel?: string;
  resumeLabel?: string;
  stopLabel: string;
  onPause?: () => void;
  onResume?: () => void;
  onStop: () => void;
};

export function ActiveTimerCard({
  projectName,
  context,
  elapsed,
  status,
  statusLabel,
  pauseLabel,
  resumeLabel,
  stopLabel,
  onPause,
  onResume,
  onStop,
}: ActiveTimerCardProps) {
  const { theme } = useTheme();
  const running = status === 'running';

  return (
    <View
      style={{
        padding: theme.spacing.lg,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.surfaceElevated,
        gap: theme.spacing.sm,
      }}
    >
      <View
        style={{
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
          paddingHorizontal: theme.spacing.sm,
          minHeight: 24,
          borderRadius: theme.radii.sm,
          backgroundColor: running ? theme.colors.accentSoft : theme.colors.surfaceMuted,
        }}
      >
        <AppIcon
          name={running ? 'play' : 'pause'}
          size={theme.sizing.metadataIcon}
          color={running ? theme.colors.accent : theme.colors.textSecondary}
        />
        <Text
          style={{
            ...theme.typography.micro,
            color: running ? theme.colors.accent : theme.colors.textSecondary,
          }}
        >
          {statusLabel}
        </Text>
      </View>

      <View>
        <Text style={{ ...theme.typography.bodyStrong, color: theme.colors.textPrimary }}>{projectName}</Text>
        {context ? (
          <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary }}>{context}</Text>
        ) : null}
      </View>

      <Text
        style={{
          ...theme.typography.display,
          color: theme.colors.textPrimary,
          fontVariant: ['tabular-nums'],
        }}
      >
        {elapsed}
      </Text>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <View style={{ flex: 1 }}>
          {running && pauseLabel && onPause ? (
            <ActionButton label={pauseLabel} accessibilityLabel={pauseLabel} variant="secondary" onPress={onPause} />
          ) : !running && resumeLabel && onResume ? (
            <ActionButton label={resumeLabel} accessibilityLabel={resumeLabel} onPress={onResume} />
          ) : null}
        </View>
        <View style={{ flex: 1 }}>
          <ActionButton label={stopLabel} accessibilityLabel={stopLabel} variant="danger" onPress={onStop} />
        </View>
      </View>
    </View>
  );
}
