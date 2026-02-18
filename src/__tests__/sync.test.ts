// Mock transitive Expo/RN dependencies before importing anything from the app.
jest.mock("../lib/supabase", () => ({ supabase: {} }));
jest.mock("../lib/storage", () => ({
  localCache: {
    getNotes: jest.fn(() => []),
    setNotes: jest.fn()
  }
}));

import { mergeLww } from "../lib/sync";
import type { Note } from "../types/domain";

function makeNote(id: string, updatedAt: string, title = "Title"): Note {
  return {
    id,
    user_id: "user-1",
    title,
    content: "",
    folder_id: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: updatedAt
  };
}

describe("mergeLww", () => {
  it("returns remote notes when local is empty", () => {
    const remote = [makeNote("a", "2024-01-02T00:00:00Z")];
    expect(mergeLww([], remote)).toEqual(remote);
  });

  it("returns local notes when remote is empty", () => {
    const local = [makeNote("a", "2024-01-02T00:00:00Z")];
    expect(mergeLww(local, [])).toEqual(local);
  });

  it("prefers remote when remote is newer", () => {
    const local = [makeNote("a", "2024-01-01T00:00:00Z", "Old")];
    const remote = [makeNote("a", "2024-01-02T00:00:00Z", "New")];
    const result = mergeLww(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("New");
  });

  it("keeps local when local is newer than remote", () => {
    const local = [makeNote("a", "2024-01-03T00:00:00Z", "Local")];
    const remote = [makeNote("a", "2024-01-02T00:00:00Z", "Remote")];
    const result = mergeLww(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Local");
  });

  it("prefers remote on equal timestamps (remote wins ties)", () => {
    const ts = "2024-01-02T00:00:00Z";
    const local = [makeNote("a", ts, "Local")];
    const remote = [makeNote("a", ts, "Remote")];
    const result = mergeLww(local, remote);
    expect(result[0].title).toBe("Remote");
  });

  it("merges disjoint sets — all notes are present", () => {
    const local = [makeNote("a", "2024-01-02T00:00:00Z")];
    const remote = [makeNote("b", "2024-01-01T00:00:00Z")];
    const result = mergeLww(local, remote);
    expect(result).toHaveLength(2);
    const ids = result.map((n) => n.id);
    expect(ids).toContain("a");
    expect(ids).toContain("b");
  });

  it("sorts result descending by updated_at", () => {
    const local = [makeNote("a", "2024-01-01T00:00:00Z")];
    const remote = [makeNote("b", "2024-01-03T00:00:00Z"), makeNote("c", "2024-01-02T00:00:00Z")];
    const result = mergeLww(local, remote);
    expect(result.map((n) => n.id)).toEqual(["b", "c", "a"]);
  });

  it("produces no duplicate entries when note ids overlap", () => {
    // Use millisecond offsets from a fixed base to avoid invalid ISO dates
    const janBase = new Date("2024-01-01T00:00:00Z").getTime();
    const febBase = new Date("2024-02-01T00:00:00Z").getTime();
    const local = Array.from({ length: 50 }, (_, i) =>
      makeNote(`note-${i}`, new Date(janBase + i * 1000).toISOString())
    );
    // Remote covers note-25 through note-74; all in Feb (newer than all local Jan timestamps)
    const remote = Array.from({ length: 50 }, (_, i) =>
      makeNote(`note-${i + 25}`, new Date(febBase + i * 1000).toISOString())
    );
    const result = mergeLww(local, remote);
    const ids = result.map((n) => n.id);
    // No duplicates; 75 unique note IDs (0-74)
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(75);
    // Notes 25-49 appear in both; remote (Feb) is newer, so remote wins
    for (let i = 25; i < 50; i++) {
      const note = result.find((n) => n.id === `note-${i}`);
      expect(note?.updated_at.startsWith("2024-02")).toBe(true);
    }
  });
});
