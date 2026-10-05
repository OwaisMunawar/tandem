import {
  needsRenumber,
  positionAtEnd,
  positionBetween,
  positionForStep,
  renumber,
} from '../ordering';

describe('ordering', () => {
  it('appends after the last position', () => {
    expect(positionAtEnd([])).toBe(1024);
    expect(positionAtEnd([1024, 4096, 2048])).toBe(5120);
  });

  it('finds midpoints and edges', () => {
    expect(positionBetween(undefined, undefined)).toBe(1024);
    expect(positionBetween(undefined, 1024)).toBe(0);
    expect(positionBetween(1024, undefined)).toBe(2048);
    expect(positionBetween(1024, 2048)).toBe(1536);
  });

  it('detects exhausted precision and renumbers', () => {
    expect(needsRenumber(1, 1 + 1e-9)).toBe(true);
    expect(needsRenumber(1, 2)).toBe(false);
    expect(needsRenumber(undefined, 2)).toBe(false);
    expect([...renumber([{ id: 'a' }, { id: 'b' }]).entries()]).toEqual([
      ['a', 1024],
      ['b', 2048],
    ]);
  });

  it('moves one step up or down', () => {
    const list = [
      { id: 'a', position: 1024 },
      { id: 'b', position: 2048 },
      { id: 'c', position: 3072 },
    ];
    expect(positionForStep(list, 'c', -1)).toBe(1536); // between a and b
    expect(positionForStep(list, 'b', -1)).toBe(0); // before a
    expect(positionForStep(list, 'a', 1)).toBe(2560); // between b and c
    expect(positionForStep(list, 'b', 1)).toBe(4096); // after c
    expect(positionForStep(list, 'a', -1)).toBeUndefined();
    expect(positionForStep(list, 'c', 1)).toBeUndefined();
    expect(positionForStep(list, 'zzz', 1)).toBeUndefined();
  });
});
