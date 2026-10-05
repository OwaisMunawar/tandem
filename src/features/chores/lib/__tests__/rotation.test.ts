import { decodeRotation, encodeRotation, nextAssignee } from '../rotation';

const everyone = new Set(['ngozi', 'linnea', 'sam']);

describe('nextAssignee', () => {
  it('hands the chore to the next person, wrapping around', () => {
    const rotation = ['ngozi', 'linnea', 'sam'];
    expect(nextAssignee(rotation, 'ngozi', everyone)).toBe('linnea');
    expect(nextAssignee(rotation, 'sam', everyone)).toBe('ngozi');
  });

  it('skips members who have left', () => {
    const active = new Set(['ngozi', 'sam']);
    expect(nextAssignee(['ngozi', 'linnea', 'sam'], 'ngozi', active)).toBe('sam');
  });

  it('starts at the top when the current assignee is not in the rotation', () => {
    expect(nextAssignee(['linnea', 'sam'], 'ngozi', everyone)).toBe('linnea');
  });

  it('keeps or clears the assignee when nobody in the rotation is left', () => {
    expect(nextAssignee(['gone'], 'ngozi', everyone)).toBe('ngozi');
    expect(nextAssignee(['gone'], 'also-gone', everyone)).toBe('');
  });

  it('stays with a single-person rotation', () => {
    expect(nextAssignee(['sam'], 'sam', everyone)).toBe('sam');
  });
});

describe('rotation encoding', () => {
  it('dedupes and survives junk', () => {
    expect(decodeRotation(encodeRotation(['a', 'b', 'a']))).toEqual(['a', 'b']);
    expect(decodeRotation('nope')).toEqual([]);
    expect(decodeRotation('{"a":1}')).toEqual([]);
    expect(decodeRotation('["a", 2, "b"]')).toEqual(['a', 'b']);
  });
});
