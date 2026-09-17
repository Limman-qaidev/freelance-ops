import { lightTheme } from '@/ui/theme/theme';

// Transitional aliases for legacy screens. Reconstructed screens consume useTheme().theme.
export const colors = lightTheme.colors;
export const spacing = lightTheme.spacing;
export const radii = lightTheme.radii;

export const typography = {
  display: lightTheme.typography.display.fontSize,
  title: lightTheme.typography.title.fontSize,
  sectionTitle: lightTheme.typography.section.fontSize,
  body: lightTheme.typography.body.fontSize,
  bodyStrong: lightTheme.typography.bodyStrong.fontSize,
  caption: lightTheme.typography.caption.fontSize,
  micro: lightTheme.typography.micro.fontSize,
} as const;
