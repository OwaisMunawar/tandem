import QRCode from 'qrcode';
import { useMemo } from 'react';
import { View } from 'react-native';

/**
 * Renders a QR code from plain Views. The matrix comes from `qrcode`'s pure
 * JS encoder, so there is no SVG or canvas dependency just for one image.
 * Rows are run-length merged to keep the view count low.
 */
export function InviteQr({ value, size = 200 }: { value: string; size?: number }) {
  const rows = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const count = modules.size;
    const result: { runs: { start: number; length: number }[] }[] = [];
    for (let y = 0; y < count; y += 1) {
      const runs: { start: number; length: number }[] = [];
      let x = 0;
      while (x < count) {
        if (modules.get(y, x)) {
          const start = x;
          while (x < count && modules.get(y, x)) x += 1;
          runs.push({ start, length: x - start });
        } else {
          x += 1;
        }
      }
      result.push({ runs });
    }
    return { count, rows: result };
  }, [value]);

  // Quiet zone of two modules, required by scanners, drawn as padding.
  const cell = size / (rows.count + 4);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Household invite QR code"
      testID="invite-qr"
      style={{
        width: size,
        height: size,
        backgroundColor: '#FFFFFF',
        padding: cell * 2,
        borderRadius: 12,
      }}>
      {rows.rows.map((row, y) => (
        <View key={y} style={{ height: cell, flexDirection: 'row' }}>
          {row.runs.map((run) => (
            <View
              key={run.start}
              style={{
                position: 'absolute',
                left: run.start * cell,
                width: run.length * cell,
                height: cell,
                backgroundColor: '#0F1A17',
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
