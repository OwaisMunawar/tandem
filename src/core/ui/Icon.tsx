import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { type ColorValue } from 'react-native';

/**
 * Semantic icon names. Screens ask for "trash", not for an SF Symbol or a
 * Material glyph, so each platform gets its native icon from one table.
 */
const glyphs = {
  plus: { ios: 'plus', android: 'add' },
  check: { ios: 'checkmark', android: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  circle: { ios: 'circle', android: 'radio_button_unchecked' },
  trash: { ios: 'trash', android: 'delete' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  close: { ios: 'xmark', android: 'close' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome' },
  cart: { ios: 'cart', android: 'shopping_cart' },
  checklist: { ios: 'checklist', android: 'checklist' },
  chores: { ios: 'bubbles.and.sparkles', android: 'cleaning_services' },
  person: { ios: 'person.crop.circle', android: 'person' },
  people: { ios: 'person.2', android: 'group' },
  qr: { ios: 'qrcode', android: 'qr_code' },
  scan: { ios: 'qrcode.viewfinder', android: 'qr_code_scanner' },
  share: { ios: 'square.and.arrow.up', android: 'share' },
  link: { ios: 'link', android: 'link' },
  synced: { ios: 'checkmark.icloud', android: 'cloud_done' },
  offline: { ios: 'icloud.slash', android: 'cloud_off' },
  syncing: { ios: 'arrow.triangle.2.circlepath', android: 'sync' },
  repeat: { ios: 'repeat', android: 'repeat' },
  rotate: { ios: 'arrow.2.squarepath', android: 'autorenew' },
  calendar: { ios: 'calendar', android: 'calendar_today' },
  bell: { ios: 'bell', android: 'notifications' },
  pencil: { ios: 'pencil', android: 'edit' },
  arrowUp: { ios: 'arrow.up', android: 'arrow_upward' },
  arrowDown: { ios: 'arrow.down', android: 'arrow_downward' },
  leave: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  pause: { ios: 'pause.circle', android: 'pause_circle' },
  play: { ios: 'play.circle', android: 'play_circle' },
  server: { ios: 'server.rack', android: 'dns' },
  moon: { ios: 'moon', android: 'dark_mode' },
} as const satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof glyphs;

export function Icon({
  name,
  size = 20,
  color,
}: {
  name: IconName;
  size?: number;
  color: ColorValue;
}) {
  return (
    <SymbolView
      name={glyphs[name]}
      size={size}
      tintColor={color}
      weight="medium"
      style={{ width: size, height: size }}
    />
  );
}
