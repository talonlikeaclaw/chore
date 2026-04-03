import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { rooms } from "@/db/schema";

describe("rooms table", () => {
  it("has expected columns", () => {
    const cols = getTableColumns(rooms);
    expect(cols).toHaveProperty("id");
    expect(cols).toHaveProperty("name");
    expect(cols).toHaveProperty("createdAt");
    expect(cols).toHaveProperty("updatedAt");
  });
});
