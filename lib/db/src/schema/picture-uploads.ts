import { integer, pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const pictureUploadsTable = pgTable("picture_uploads", {
  objectPath: text("object_path").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("picture_uploads_user_created").on(table.userId, table.createdAt)]);
