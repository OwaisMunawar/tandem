/**
 * Design tokens. Components read semantic roles (`surface`, `textMuted`)
 * rather than palette values, so light and dark differ only in this file.
 */

const palette = {
  linen: '#F5F3EC',
  linenRaised: '#FFFFFF',
  linenSunken: '#EAE7DD',
  ink: '#16201D',
  inkSoft: '#56625E',
  inkFaint: '#8C9692',
  pine: '#0F1A17',
  pineRaised: '#18261F',
  pineSunken: '#0A1210',
  mist: '#EEF2EF',
  mistSoft: '#AEBAB5',
  mistFaint: '#77847F',
  teal: '#1F7A63',
  tealSoft: '#D5ECE4',
  tealDeep: '#123B33',
  coral: '#E0573F',
  coralSoft: '#F9DCD5',
  coralDeep: '#4F2119',
  saffron: '#C68A12',
  saffronSoft: '#F5E7C6',
  saffronDeep: '#45320C',
  sky: '#3A78C9',
  skySoft: '#DCE8F7',
  skyDeep: '#172C47',
} as const;

export type ColorRoles = {
  background: string;
  surface: string;
  surfaceSunken: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  scrim: string;
};

const light: ColorRoles = {
  background: palette.linen,
  surface: palette.linenRaised,
  surfaceSunken: palette.linenSunken,
  border: 'rgba(22, 32, 29, 0.09)',
  text: palette.ink,
  textMuted: palette.inkSoft,
  textFaint: palette.inkFaint,
  accent: palette.teal,
  accentSoft: palette.tealSoft,
  onAccent: '#FFFFFF',
  success: palette.teal,
  successSoft: palette.tealSoft,
  warning: palette.saffron,
  warningSoft: palette.saffronSoft,
  danger: palette.coral,
  dangerSoft: palette.coralSoft,
  info: palette.sky,
  infoSoft: palette.skySoft,
  scrim: 'rgba(15, 26, 23, 0.4)',
};

const dark: ColorRoles = {
  background: palette.pine,
  surface: palette.pineRaised,
  surfaceSunken: palette.pineSunken,
  border: 'rgba(238, 242, 239, 0.08)',
  text: palette.mist,
  textMuted: palette.mistSoft,
  textFaint: palette.mistFaint,
  accent: '#4FC3A1',
  accentSoft: palette.tealDeep,
  onAccent: '#06110E',
  success: '#4FC3A1',
  successSoft: palette.tealDeep,
  warning: '#E9B348',
  warningSoft: palette.saffronDeep,
  danger: '#FF7A61',
  dangerSoft: palette.coralDeep,
  info: '#76A9EC',
  infoSoft: palette.skyDeep,
  scrim: 'rgba(0, 0, 0, 0.55)',
};

/**
 * Member colours. Picked so neighbours stay distinguishable for the common
 * colour-vision deficiencies and keep contrast on both backgrounds.
 */
export const memberColors = [
  '#1F7A63',
  '#E0573F',
  '#3A78C9',
  '#C68A12',
  '#8A55C2',
  '#C2457E',
  '#2F8F9D',
  '#6B7A2A',
] as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.6 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400', letterSpacing: 0 },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '500', letterSpacing: 0 },
  caption: { fontSize: 13, lineHeight: 17, fontWeight: '500', letterSpacing: 0.1 },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.9 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const motion = {
  fast: 160,
  base: 240,
  slow: 420,
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
} as const;

export type Scheme = 'light' | 'dark';

export type Theme = {
  scheme: Scheme;
  colors: ColorRoles;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  motion: typeof motion;
};

export const themes: Record<Scheme, Theme> = {
  light: { scheme: 'light', colors: light, spacing, radii, typography, motion },
  dark: { scheme: 'dark', colors: dark, spacing, radii, typography, motion },
};
