import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui';

/** Inline add. Categorisation happens in the repository, so typing stays fast. */
export function AddItemField({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (title: string) => void;
}) {
  const [text, setText] = useState('');
  const { colors, radii, spacing, typography } = useTheme();

  const submit = () => {
    const title = text.trim();
    if (!title) return;
    onAdd(title);
    setText('');
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        minHeight: 48,
        borderRadius: radii.md,
        backgroundColor: colors.surfaceSunken,
      }}>
      <Icon name="plus" size={18} color={colors.accent} />
      <TextInput
        testID="add-item-input"
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.accent}
        returnKeyType="done"
        submitBehavior="submit"
        accessibilityLabel={placeholder}
        style={[typography.body, { flex: 1, color: colors.text, paddingVertical: spacing.sm }]}
      />
    </View>
  );
}
