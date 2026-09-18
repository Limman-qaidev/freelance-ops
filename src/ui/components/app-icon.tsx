import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

const ICONS = { settings: 'cog-outline', play: 'play', pause: 'pause', stop: 'stop', chevronRight: 'chevron-right', add: 'plus', error: 'alert-circle-outline', warning: 'alert-outline', expense: 'receipt-text-outline', manualTime: 'clock-edit-outline', today: 'calendar-today', projects: 'briefcase-outline', tasks: 'checkbox-marked-outline', planning: 'calendar-range', more: 'dots-horizontal', back: 'arrow-left' } as const;
export type AppIconName = keyof typeof ICONS;
type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
export function AppIcon({ name, size = 20, color }: { name: AppIconName; size?: number; color?: ColorValue }) { return <MaterialCommunityIcons name={ICONS[name] as MaterialIconName} size={size} color={color} />; }