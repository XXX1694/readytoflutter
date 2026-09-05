/**
 * The startup backend probe.
 *
 * On the GitHub Pages build there is no backend at all, and the probe's URL
 * resolves against the origin root — so every cold load spent a request on a
 * guaranteed `/api/auth/health` 404 plus a red console error. The guard has to
 * live in the store: `AccountMenu` calls `probeBackend` from a mount effect
 * inside `App`, and React runs child effects first, so `App`'s own `noBackend`
 * check ran after the request had already gone out.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('axios', () => ({ default: { get: mocks.get } }));

// Fresh module graph per test so `noBackend` — a build-time constant in
// api/api.ts — can differ between them.
const loadAuth = async (noBackend: boolean): Promise<typeof import('./auth')> => {
  vi.resetModules();
  vi.doMock('../api/api', () => ({ noBackend }));
  return import('./auth');
};

beforeEach(() => {
  mocks.get.mockReset();
});

describe('probeBackend', () => {
  it('resolves false without spending a request when the build has no backend', async () => {
    const { useAuth } = await loadAuth(true);

    await expect(useAuth.getState().probeBackend('/api')).resolves.toBe(false);

    expect(mocks.get).not.toHaveBeenCalled();
    expect(useAuth.getState().backendAvailable).toBe(false);
    expect(useAuth.getState().probing).toBe(false);
  });

  it('still pings /auth/health when a backend is configured', async () => {
    mocks.get.mockResolvedValue({ data: { ok: true } });
    const { useAuth } = await loadAuth(false);

    await expect(useAuth.getState().probeBackend('/api')).resolves.toBe(true);

    expect(mocks.get).toHaveBeenCalledWith('/api/auth/health', { timeout: 2500 });
    expect(useAuth.getState().backendAvailable).toBe(true);
  });
});
