DELETE FROM "household_member" a
USING "household_member" b
WHERE a.user_id = b.user_id
  AND a.household_id <> b.household_id
  AND (
    (a.role = 'member' AND b.role = 'owner')
    OR (a.role = b.role AND a.joined_at > b.joined_at)
    OR (a.role = b.role AND a.joined_at = b.joined_at AND a.household_id > b.household_id)
  );--> statement-breakpoint
UPDATE "household_member" m
SET role = 'owner'
WHERE m.role <> 'owner'
  AND NOT EXISTS (
    SELECT 1 FROM "household_member" o
    WHERE o.household_id = m.household_id AND o.role = 'owner'
  )
  AND m.user_id = (
    SELECT x.user_id FROM "household_member" x
    WHERE x.household_id = m.household_id
    ORDER BY x.joined_at, x.user_id
    LIMIT 1
  );--> statement-breakpoint
DROP INDEX "household_member_userId_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "household_member_userId_idx" ON "household_member" USING btree ("user_id");
