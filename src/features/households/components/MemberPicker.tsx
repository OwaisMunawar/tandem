import { ScrollView } from 'react-native';

import { useTheme } from '@/core/theme';
import { Chip } from '@/core/ui';

import { useActiveMembers } from '../hooks/useHouseholdData';
import { firstName } from '../lib/members';

/** Single-select assignee chips with an explicit "Anyone" option. */
export function MemberPicker({
  value,
  onChange,
  allowNone = true,
  testID,
}: {
  value: string;
  onChange: (memberId: string) => void;
  allowNone?: boolean;
  testID?: string;
}) {
  const members = useActiveMembers();
  const { spacing } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm }}
      testID={testID}>
      {allowNone && <Chip label="Anyone" selected={value === ''} onPress={() => onChange('')} />}
      {members.map((member) => (
        <Chip
          key={member.id}
          testID={testID ? `${testID}-${member.id}` : undefined}
          label={firstName(member.name)}
          color={member.color}
          selected={value === member.id}
          onPress={() => onChange(member.id)}
        />
      ))}
    </ScrollView>
  );
}

/** Ordered multi-select: tap order is rotation order. */
export function RotationPicker({
  value,
  onChange,
}: {
  value: readonly string[];
  onChange: (memberIds: string[]) => void;
}) {
  const members = useActiveMembers();
  const { spacing } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm }}>
      {members.map((member) => {
        const index = value.indexOf(member.id);
        return (
          <Chip
            key={member.id}
            testID={`rotation-${member.id}`}
            label={index >= 0 ? `${index + 1}. ${firstName(member.name)}` : firstName(member.name)}
            color={member.color}
            selected={index >= 0}
            onPress={() =>
              onChange(index >= 0 ? value.filter((id) => id !== member.id) : [...value, member.id])
            }
          />
        );
      })}
    </ScrollView>
  );
}
