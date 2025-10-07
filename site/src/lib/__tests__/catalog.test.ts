import { afterEach, describe, expect, it, vi } from 'vitest';

import * as fetchJSONModule from '../fetchJSON';

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('loadCatalog', () => {
  it('filters invalid entries and preserves ordering for null identifiers', async () => {
    const spy = vi.spyOn(fetchJSONModule, 'fetchJSON').mockResolvedValue({
      activities: [
        null,
        { activity_id: null, label: 'Null identifier' },
        { activity_id: 'VALID.ONE', label: 'Valid one' },
        { not_an_activity: true },
      ],
      profiles: [
        undefined,
        { profile_id: null, label: 'Null profile' },
        { profile_id: 'PROFILE.ONE', label: 'Profile one' },
      ],
    });

    const { loadCatalog } = await import('../catalog');
    const catalog = await loadCatalog();

    expect(catalog.activities).toHaveLength(2);
    expect(catalog.activities[0]?.activity_id ?? null).toBeNull();
    expect(catalog.activities[1]?.activity_id).toBe('VALID.ONE');
    expect(catalog.profiles).toHaveLength(2);
    expect(catalog.profiles[0]?.profile_id ?? null).toBeNull();
    expect(catalog.profiles[1]?.profile_id).toBe('PROFILE.ONE');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
