import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';

import { ScalePressable } from './Pressable';
import { Text } from './Text';

type ToastOptions = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
};

type ToastApi = { show(options: ToastOptions): void };

const ToastContext = createContext<ToastApi>({ show: () => undefined });

/**
 * Single-slot toast. Undo here restores a snapshot instead of delaying the
 * write: a delete must reach other phones straight away, and an undo is just
 * another change that merges like any other.
 */
export function ToastProvider({
  children,
  bottomOffset = 150,
}: {
  children: ReactNode;
  bottomOffset?: number;
}) {
  const [toast, setToast] = useState<(ToastOptions & { key: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ ...options, key: Date.now() });
      timer.current = setTimeout(dismiss, options.durationMs ?? 5_000);
    },
    [dismiss],
  );

  useEffect(() => dismiss, [dismiss]);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext value={api}>
      {children}
      {toast && (
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + bottomOffset }}>
          <Animated.View
            key={toast.key}
            entering={FadeInDown.springify().damping(18)}
            exiting={FadeOutDown.duration(160)}
            accessibilityLiveRegion="polite"
            style={{
              marginHorizontal: spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              borderRadius: radii.md,
              backgroundColor: colors.text,
            }}>
            <Text variant="callout" style={{ flex: 1, color: colors.background }}>
              {toast.message}
            </Text>
            {toast.actionLabel && (
              <ScalePressable
                testID="toast-action"
                accessibilityRole="button"
                onPress={() => {
                  toast.onAction?.();
                  dismiss();
                }}>
                <Text variant="headline" style={{ color: colors.accentSoft }}>
                  {toast.actionLabel}
                </Text>
              </ScalePressable>
            )}
          </Animated.View>
        </View>
      )}
    </ToastContext>
  );
}

export function useToast(): ToastApi {
  return use(ToastContext);
}
