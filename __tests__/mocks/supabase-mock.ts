import { vi } from "vitest";

// Build a chainable Supabase query mock that returns predefined data.
// Usage:
//   const sb = makeSupabaseMock({
//     "card_searches": { data: [{ id: "1", name: "Test" }] },
//     "marketplace_connections": { data: [{ access_token: "x" }] },
//   });
export interface TableResponse {
  data?: unknown;
  error?: unknown;
  count?: number;
}

export interface SupabaseMockConfig {
  [tableName: string]: TableResponse | TableResponse[];
}

export function makeSupabaseMock(config: SupabaseMockConfig = {}) {
  // Track operations performed for assertions
  const calls: Array<{
    table: string;
    method: string;
    args: unknown[];
  }> = [];

  // Per-table call counter so list-style configs (TableResponse[]) can return
  // different responses on each successive call to the same table.
  const tableCallIndex: Record<string, number> = {};

  const makeQuery = (table: string) => {
    const log = (method: string, ...args: unknown[]) => {
      calls.push({ table, method, args });
    };

    const resolveResponse = (): TableResponse => {
      const cfg = config[table];
      if (!cfg) return { data: null, error: null };
      if (Array.isArray(cfg)) {
        const idx = tableCallIndex[table] ?? 0;
        tableCallIndex[table] = idx + 1;
        return cfg[Math.min(idx, cfg.length - 1)];
      }
      return cfg;
    };

    const query: Record<string, unknown> = {};
    const chainable = [
      "select",
      "insert",
      "update",
      "upsert",
      "delete",
      "eq",
      "neq",
      "in",
      "order",
      "limit",
      "ilike",
      "match",
    ];
    chainable.forEach((m) => {
      query[m] = vi.fn((...args: unknown[]) => {
        log(m, ...args);
        return query;
      });
    });

    // Terminal / awaitable methods
    query.single = vi.fn(() => {
      log("single");
      const res = resolveResponse();
      const data = Array.isArray(res.data) ? res.data[0] || null : res.data || null;
      return Promise.resolve({ data, error: res.error || null });
    });
    query.maybeSingle = query.single;

    // Make the chain itself awaitable — many Supabase queries don't end with .single()
    (query as unknown as { then: (cb: (v: unknown) => unknown) => Promise<unknown> }).then = (cb) => {
      const res = resolveResponse();
      return Promise.resolve(cb({
        data: res.data ?? null,
        error: res.error ?? null,
        count: res.count,
      }));
    };

    return query;
  };

  const client = {
    from: vi.fn((table: string) => makeQuery(table)),
    storage: {
      from: vi.fn(() => ({
        download: vi.fn(() => Promise.resolve({ data: null, error: null })),
        createSignedUrl: vi.fn(() =>
          Promise.resolve({ data: { signedUrl: "https://signed-url" }, error: null })
        ),
      })),
    },
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: "test-user-id", email: "test@example.com" } },
          error: null,
        })
      ),
    },
  };

  return { client, calls };
}
