import { getTableColumns } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { chores, completions, householdMembers, rooms } from "@/db/schema";

describe("household_member table", () => {
  it("makes user_id unique so a user belongs to one household", () => {
    const { indexes } = getTableConfig(householdMembers);
    const idx = indexes.find(
      (i) => i.config.name === "household_member_userId_idx"
    );
    expect(idx?.config.unique).toBe(true);
  });
});

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
    expect(cols).toHaveProperty("recurrence");
    expect(cols).toHaveProperty("recurrenceInterval");
    expect(cols).toHaveProperty("recurrenceWeekday");
    expect(cols).toHaveProperty("recurrenceMonthDay");
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
