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
    successSoft: string;
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
    background: '#F7F9FC',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#F2F5F9',
    textPrimary: '#0B1220',
    textSecondary: '#4B5B73',
    textMuted: '#718096',
    border: '#E1E7EF',
    borderStrong: '#CBD5E1',
    accent: '#016BFA',
    accentPressed: '#0058D6',
    accentSoft: '#EAF2FF',
    onAccent: '#FFFFFF',
    success: '#10A867',
    successSoft: '#E7F8EF',
    warning: '#F59E0B',
    error: '#E5484D',
    info: '#4D7CFE',
    disabledSurface: '#EEF2F6',
    disabledText: '#98A2B3',
    focusRing: '#016BFA',
    scrim: 'rgba(11,18,32,0.45)',
  },
  spacing,
  radii,
  typography,
  sizing,
};

export const darkTheme: AppTheme = {
  colors: {
    background: '#0D1117',
    surface: '#161B22',
    surfaceElevated: '#1D2430',
    surfaceMuted: '#222A36',
    textPrimary: '#F6F8FB',
    textSecondary: '#C4CDDA',
    textMuted: '#8C99AA',
    border: '#2D3748',
    borderStrong: '#475569',
    accent: '#4D9BFF',
    accentPressed: '#2D7FE8',
    accentSoft: '#17345F',
    onAccent: '#07111F',
    success: '#4CD08A',
    successSoft: '#183A2A',
    warning: '#F6B94B',
    error: '#FF7B7B',
    info: '#7AB8FF',
    disabledSurface: '#252D38',
    disabledText: '#687586',
    focusRing: '#74AFFF',
    scrim: 'rgba(0,0,0,0.62)',
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
