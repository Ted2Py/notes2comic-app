import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, integer, index, unique, jsonb } from "drizzle-orm/pg-core";

// IMPORTANT! ID fields should ALWAYS use UUID types, EXCEPT the BetterAuth tables.


export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("user_email_idx").on(table.email)]
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    index("session_token_idx").on(table.token),
  ]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    index("account_provider_account_idx").on(table.providerId, table.accountId),
  ]
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// Comics table - stores generated comics
export const comics = pgTable(
  "comics",
  {
    id: text("id")
      .primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", { enum: ["draft", "generating", "completed", "failed"] }).notNull().default("draft"),
    inputType: text("input_type", { enum: ["text", "pdf", "image", "video"] }).notNull(),
    inputUrl: text("input_url"),
    artStyle: text("art_style").notNull().default("retro"),
    tone: text("tone").notNull().default("friendly"),
    subject: text("subject").notNull(),
    // Customization fields
    outputFormat: text("output_format", { enum: ["strip", "separate", "fullpage"] }).notNull().default("separate"),
    pageSize: text("page_size", { enum: ["letter", "a4", "tabloid", "a3"] }).notNull().default("letter"),
    requestedPanelCount: integer("requested_panel_count"),
    characterReference: text("character_reference"),
    isPublic: boolean("is_public").notNull().default(false),
    metadata: jsonb("metadata").$type<{
      panelCount?: number;
      generationTime?: number;
      likes?: number;
      [key: string]: unknown;
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("comics_user_id_idx").on(table.userId),
    index("comics_status_idx").on(table.status),
    index("comics_is_public_idx").on(table.isPublic),
  ]
);

// Panels table - individual comic panels
export const panels = pgTable(
  "panels",
  {
    id: text("id")
      .primaryKey(),
    comicId: text("comic_id")
      .notNull()
      .references(() => comics.id, { onDelete: "cascade" }),
    panelNumber: integer("panel_number").notNull(),
    imageUrl: text("image_url").notNull(),
    caption: text("caption").notNull(),
    // Customization fields
    textBox: text("text_box"),
    speechBubbles: jsonb("speech_bubbles").$type<SpeechBubble[]>(),
    bubblePositions: jsonb("bubble_positions").$type<BubblePosition[]>(),
    regenerationCount: integer("regeneration_count").default(0).notNull(),
    metadata: jsonb("metadata").$type<{
      generationPrompt?: string;
      characterContext?: string;
      [key: string]: unknown;
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("panels_comic_id_idx").on(table.comicId),
    index("panels_comic_number_idx").on(table.comicId, table.panelNumber),
  ]
);

// Likes table - gallery likes
export const likes = pgTable(
  "likes",
  {
    id: text("id")
      .primaryKey(),
    comicId: text("comic_id")
      .notNull()
      .references(() => comics.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("likes_comic_id_idx").on(table.comicId),
    index("likes_user_id_idx").on(table.userId),
    unique("likes_comic_user_unique").on(table.comicId, table.userId),
  ]
);

// Comments table - gallery comments
export const comments = pgTable(
  "comments",
  {
    id: text("id")
      .primaryKey(),
    comicId: text("comic_id")
      .notNull()
      .references(() => comics.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("comments_comic_id_idx").on(table.comicId),
    index("comments_user_id_idx").on(table.userId),
  ]
);

// Relation definitions for Drizzle ORM queries
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  comics: many(comics),
  likes: many(likes),
  comments: many(comments),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const comicsRelations = relations(comics, ({ one, many }) => ({
  user: one(user, {
    fields: [comics.userId],
    references: [user.id],
  }),
  panels: many(panels),
  likes: many(likes),
  comments: many(comments),
}));

export const panelsRelations = relations(panels, ({ one }) => ({
  comic: one(comics, {
    fields: [panels.comicId],
    references: [comics.id],
  }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  comic: one(comics, {
    fields: [likes.comicId],
    references: [comics.id],
  }),
  user: one(user, {
    fields: [likes.userId],
    references: [user.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  comic: one(comics, {
    fields: [comments.comicId],
    references: [comics.id],
  }),
  user: one(user, {
    fields: [comments.userId],
    references: [user.id],
  }),
}));

// Speech bubble and position types for comic customization
export interface SpeechBubble {
  id: string;
  text: string;
  character?: string;
  type: "dialogue" | "thought" | "narration";
}

export interface BubblePosition {
  bubbleId: string;
  x: number;      // Percentage position (0-100)
  y: number;      // Percentage position (0-100)
  width: number;  // Percentage width (0-100)
  height: number; // Percentage height (0-100)
  tailDirection?: "top" | "bottom" | "left" | "right" | "none";
}
