import { describe, it, expect } from 'vitest';
import { AVATARS, getAvatar } from '@/identity/avatars';

describe('player avatar choices', () => {
  it('offers ten distinct avatars including gold and blue fish', () => {
    expect(AVATARS).toHaveLength(10);
    expect(new Set(AVATARS.map((avatar) => avatar.id)).size).toBe(10);
    expect(AVATARS.map((avatar) => avatar.id)).toEqual(expect.arrayContaining(['goldfish', 'bluefish']));
  });
  it('resolves a selected fish and defaults unknown selections to Goldie', () => {
    expect(getAvatar('bluefish').id).toBe('bluefish');
    expect(getAvatar('invalid').id).toBe('goldfish');
  });
});