import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Radio state table - stores the global state of the radio station
 * This ensures all listeners hear the same song at the same time
 */
export const radioState = mysqlTable("radioState", {
  id: int("id").autoincrement().primaryKey(),
  /** Current song index in the global playlist */
  currentSongIndex: int("currentSongIndex").notNull().default(0),
  /** Current playback position in seconds */
  currentPosition: int("currentPosition").notNull().default(0),
  /** Timestamp when the current song started playing */
  songStartedAt: timestamp("songStartedAt").notNull().defaultNow(),
  /** ID of the current playlist being played */
  currentPlaylistId: varchar("currentPlaylistId", { length: 64 }),
  /** Serialized array of song IDs in play order (to avoid re-shuffling) */
  playlistOrder: text("playlistOrder"),
  /** Whether the radio is currently playing */
  isPlaying: int("isPlaying").notNull().default(1), // 1 = playing, 0 = paused
  /** Last update timestamp */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RadioState = typeof radioState.$inferSelect;
export type InsertRadioState = typeof radioState.$inferInsert;