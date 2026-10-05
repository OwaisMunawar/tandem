import { createContext, use, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { themes, type Scheme, type Theme } from './tokens';

export type SchemePreference = Scheme | 'system';

const ThemeContext = createContext<Theme>(themes.light);

export function ThemeProvider({
  children,
  preference = 'system',
}: {
  children: ReactNode;
  /** A per-device setting; `system` follows the OS appearance. */
  preference?: SchemePreference;
}) {
  const system = useColorScheme();
  const resolved: Scheme =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  return <ThemeContext value={themes[resolved]}>{children}</ThemeContext>;
}

export function useTheme(): Theme {
  return use(ThemeContext);
}
