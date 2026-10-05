import { isTandemError } from '@/core/errors/TandemError';

import { buildInviteUrl, inviteFromParams, parseInvite } from '../invite';
import { firstName, nextMemberColor, normaliseMemberName, sortMembers } from '../members';

const invite = {
  roomId: 'AbCdEfGhIjKlMnOpQrStUv',
  serverUrl: 'wss://sync.example.com',
  householdName: 'Flat 4B & co',
};

describe('invites', () => {
  it('round-trips through a deep link', () => {
    const url = buildInviteUrl(invite);
    expect(url.startsWith('tandem://join?room=')).toBe(true);
    expect(parseInvite(url)).toEqual(invite);
  });

  it('accepts an https link to a /join path', () => {
    const url = buildInviteUrl(invite).replace('tandem://join', 'https://tandem.example/join');
    expect(parseInvite(url)).toEqual(invite);
  });

  it('rejects things that are not invites', () => {
    const attempt = (raw: string) => {
      try {
        parseInvite(raw);
        return 'parsed';
      } catch (error) {
        return isTandemError(error, 'INVALID_INVITE') ? 'invalid' : 'other';
      }
    };
    expect(attempt('https://example.com')).toBe('invalid');
    expect(attempt('tandem://join?room=short&server=ws://x')).toBe('invalid');
    expect(attempt(`tandem://join?room=${invite.roomId}`)).toBe('invalid');
    expect(attempt(`tandem://join?room=${invite.roomId}&server=ws://x&name=%E0%A4%A`)).toBe(
      'parsed',
    );
  });

  it('reads router params, including array values', () => {
    expect(
      inviteFromParams({ room: [invite.roomId], server: 'localhost:8043', name: undefined }),
    ).toEqual({
      roomId: invite.roomId,
      serverUrl: 'ws://localhost:8043',
      householdName: '',
    });
  });
});

describe('members', () => {
  it('picks the first unused colour, then cycles', () => {
    expect(nextMemberColor([])).toBe('#1F7A63');
    expect(nextMemberColor(['#1f7a63'])).toBe('#E0573F');
    const all = [
      '#1F7A63',
      '#E0573F',
      '#3A78C9',
      '#C68A12',
      '#8A55C2',
      '#C2457E',
      '#2F8F9D',
      '#6B7A2A',
    ];
    expect(nextMemberColor(all)).toBe('#1F7A63');
  });

  it('normalises names and sorts by join order', () => {
    expect(normaliseMemberName('  Sam   Reyes ')).toBe('Sam Reyes');
    expect(firstName('Linnea Lindqvist')).toBe('Linnea');
    expect(
      sortMembers([
        { name: 'B', joinedAt: 2 },
        { name: 'A', joinedAt: 2 },
        { name: 'C', joinedAt: 1 },
      ]).map((m) => m.name),
    ).toEqual(['C', 'A', 'B']);
  });
});
