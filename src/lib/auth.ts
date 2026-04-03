import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { households, householdMembers } from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const householdId = crypto.randomUUID();
          const inviteCode = crypto.randomUUID();
          await db.insert(households).values({
            id: householdId,
            name: `${user.name}'s Household`,
            inviteCode,
          });
          await db.insert(householdMembers).values({
            householdId,
            userId: user.id,
            role: "owner",
          });
        },
      },
    },
  },
});
