import { afterEach, beforeEach } from 'vitest';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

// In-memory localStorage that's deterministic and easy to clear. Replaces
// jsdom's so the SRS module's readKey / writeKey paths can be exercised
// without flaky ordering between test files.
class MemoryStorage {
  constructor() { this.store = new Map(); }
  get length() { return this.store.size; }
  key(i) { return Array.from(this.store.keys())[i] ?? null; }
  getItem(k) { return this.store.has(k) ? this.store.get(k) : null; }
  setItem(k, v) { this.store.set(String(k), String(v)); }
  removeItem(k) { this.store.delete(k); }
  clear() { this.store.clear(); }
}

const memStorage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: memStorage,
});

beforeEach(() => { memStorage.clear(); });
afterEach(() => { memStorage.clear(); });
