import type { ThemePreference } from '@/preferences/ui-preferences';

export type ResolvedThemeMode = 'light' | 'dark';
export type SystemColorScheme = 'light' | 'dark' | 'unspecified' | null | undefined;

type TypographyToken = {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '600' | '700';
};

export type AppTheme = {
  colors: {
    background: string;
    surface: string;
    surfaceElevated: string;
    surfaceMuted: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    borderStrong: string;
    accent: string;
    accentPressed: string;
    accentSoft: string;
    onAccent: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    disabledSurface: string;
    disabledText: string;
    focusRing: string;
    scrim: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
  };
  radii: { sm: number; md: number; lg: number };
  typography: {
    display: TypographyToken;
    title: TypographyToken;
    section: TypographyToken;
    body: TypographyToken;
    bodyStrong: TypographyToken;
    caption: TypographyToken;
    micro: TypographyToken;
  };
  sizing: {
    buttonHeight: number;
    rowMinHeight: number;
    projectRowMinHeight: number;
    iconButtonTarget: number;
    bottomIcon: number;
    inlineIcon: number;
    metadataIcon: number;
  };
};

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
const radii = { sm: 8, md: 12, lg: 16 } as const;
const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  section: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  micro: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
} as const;
const sizing = {
  buttonHeight: 48,
  rowMinHeight: 56,
  projectRowMinHeight: 68,
  iconButtonTarget: 44,
  bottomIcon: 22,
  inlineIcon: 20,
  metadataIcon: 16,
} as const;

export const lightTheme: AppTheme = {
  colors: {
    background: '#F5F7F7',
    surface: '#FFFFFF',
    surfaceElevated: '#FBFCFC',
    surfaceMuted: '#EEF2F1',
    textPrimary: '#17211F',
    textSecondary: '#40504C',
    textMuted: '#64716E',
    border: '#D8E0DE',
    borderStrong: '#B8C5C2',
    accent: '#0F766E',
    accentPressed: '#0B5F59',
    accentSoft: '#DDF2EF',
    onAccent: '#FFFFFF',
    success: '#2E7D32',
    warning: '#A86400',
    error: '#B3261E',
    info: '#2F6F8F',
    disabledSurface: '#E7ECEB',
    disabledText: '#88938F',
    focusRing: '#0F766E',
    scrim: 'rgba(11,20,18,0.44)',
  },
  spacing,
  radii,
  typography,
  sizing,
};

export const darkTheme: AppTheme = {
  colors: {
    background: '#101615',
    surface: '#16201E',
    surfaceElevated: '#1C2825',
    surfaceMuted: '#222F2C',
    textPrimary: '#F1F5F4',
    textSecondary: '#C3CDCA',
    textMuted: '#8FA09C',
    border: '#2E3B38',
    borderStrong: '#465753',
    accent: '#41B7AA',
    accentPressed: '#319A8F',
    accentSoft: '#173C38',
    onAccent: '#07211E',
    success: '#67C96E',
    warning: '#E0A84B',
    error: '#F28482',
    info: '#74B8D4',
    disabledSurface: '#24302E',
    disabledText: '#6F7F7B',
    focusRing: '#63CFC3',
    scrim: 'rgba(0,0,0,0.60)',
  },
  spacing,
  radii,
  typography,
  sizing,
};

export function resolveThemeMode(
  preference: ThemePreference,
  systemColorScheme: SystemColorScheme,
): ResolvedThemeMode {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }

  return systemColorScheme === 'dark' ? 'dark' : 'light';
}
