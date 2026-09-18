import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

const ICONS = {
  settings: 'cog-outline',
  play: 'play',
  pause: 'pause',
  stop: 'stop',
  chevronRight: 'chevron-right',
  chevronDown: 'chevron-down',
  add: 'plus',
  error: 'alert-circle-outline',
  warning: 'alert-outline',
  expense: 'receipt-text-outline',
  manualTime: 'clock-edit-outline',
  today: 'calendar-today',
  projects: 'briefcase-outline',
  tasks: 'checkbox-marked-outline',
  planning: 'calendar-range',
  more: 'dots-horizontal',
  back: 'arrow-left',
  calendar: 'calendar-blank-outline',
  wifiOff: 'wifi-strength-off-outline',
  checkCircle: 'check-circle',
  close: 'close',
} as const;

export type AppIconName = keyof typeof ICONS;

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type AppIconProps = {
  name: AppIconName;
  size?: number;
  color?: ComponentProps<typeof MaterialCommunityIcons>['color'];
};

export function AppIcon({ name, size = 20, color }: AppIconProps) {
  return <MaterialCommunityIcons name={ICONS[name] as MaterialIconName} size={size} color={color} />;
}
