import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { chores, completions, rooms } from "@/db/schema";

describe("rooms table", () => {
  it("has expected columns", () => {
    const cols = getTableColumns(rooms);
    expect(cols).toHaveProperty("id");
    expect(cols).toHaveProperty("name");
    expect(cols).toHaveProperty("createdAt");
    expect(cols).toHaveProperty("updatedAt");
  });
});

describe("chores table", () => {
  it("has expected columns", () => {
    const cols = getTableColumns(chores);
    expect(cols).toHaveProperty("id");
    expect(cols).toHaveProperty("name");
    expect(cols).toHaveProperty("roomId");
    expect(cols).toHaveProperty("intervalDays");
    expect(cols).toHaveProperty("assignedUserId");
    expect(cols).toHaveProperty("active");
    expect(cols).toHaveProperty("createdAt");
    expect(cols).toHaveProperty("updatedAt");
  });
});

describe("completions table", () => {
  it("has expected columns", () => {
    const cols = getTableColumns(completions);
    expect(cols).toHaveProperty("id");
    expect(cols).toHaveProperty("choreId");
    expect(cols).toHaveProperty("userId");
    expect(cols).toHaveProperty("completedAt");
    expect(cols).toHaveProperty("createdAt");
  });
});
