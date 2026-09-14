import { int, index, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const discordOrders = mysqlTable("discord_orders", {
  id: varchar("id", { length: 32 }).primaryKey(),
  discordId: varchar("discordId", { length: 64 }).notNull(),
  discordName: varchar("discordName", { length: 255 }).notNull(),
  plan: varchar("plan", { length: 16 }).notNull(),
  planName: varchar("planName", { length: 80 }).notNull(),
  amountCents: int("amountCents").notNull(),
  status: mysqlEnum("status", ["pending", "approved"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
  notifiedAt: timestamp("notifiedAt"),
  discordMessageId: varchar("discordMessageId", { length: 64 }),
}, table => ({ discordIdIdx: index("discord_orders_discord_id_idx").on(table.discordId) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type DiscordOrder = typeof discordOrders.$inferSelect;
