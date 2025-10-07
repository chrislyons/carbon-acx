import { describe, expect, it } from 'vitest';

import { guardIntent } from '../intentGuard';

const catalog = {
  activities: [
    { activity_id: 'COMMUTE.CAR', label: 'Commuter car travel' },
    { activity_id: 'COMMUTE.BIKE', label: 'Commuter bike travel' },
    { activity_id: 'HOME.WORK', label: 'Work from home' },
  ],
  profiles: [
    { profile_id: 'PROFILE.CA.2025', label: 'Profile CA 2025', region: 'CA' },
    { profile_id: 'PROFILE.US.2025', label: 'Profile US 2025', region: 'US' },
  ],
} as const;

describe('guardIntent', () => {
  it('blocks region drift and suggests keeping region', () => {
    const result = guardIntent(
      {
        profile: { profile_id: 'PROFILE.US.2025', region: 'US' },
        activity: { activity_id: 'COMMUTE.CAR' },
      },
      catalog,
      'switch region',
    );

    expect(result.allowed).toBe(false);
    expect(result.message).toContain('region');
    expect(result.corrections).toMatchObject({ region: 'CA' });
  });

  it('blocks year drift with suggestion', () => {
    const result = guardIntent(
      {
        profile: { profile_id: 'PROFILE.CA.2026', region: 'CA' },
        activity: { activity_id: 'COMMUTE.CAR' },
      },
      catalog,
      'new vintage',
    );

    expect(result.allowed).toBe(false);
    expect(result.message).toContain('2025');
  });

  it('refuses unknown activity and returns nearest matches', () => {
    const result = guardIntent(
      {
        profile: { profile_id: 'PROFILE.CA.2025', region: 'CA' },
        activity: { label: 'Unknown', activity_id: undefined },
      },
      catalog,
      'bike commute',
    );

    expect(result.allowed).toBe(false);
    expect(result.message).toContain('Unknown activity');
    expect(result.corrections?.suggestions).toBeDefined();
  });
});
