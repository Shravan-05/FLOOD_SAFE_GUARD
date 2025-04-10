import { sqliteTable as table, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Model
export const users = table("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  receiveAlerts: boolean("receive_alerts").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});

// Location Model
export const locations = table("locations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
  isHome: boolean("is_home").default(false)
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  lastUpdated: true
});

// Flood Risk Assessment Model
export const floodRisks = table("flood_risks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  riskLevel: text("risk_level").notNull(), // 'HIGH', 'MEDIUM', 'LOW'
  waterLevel: real("water_level"),
  thresholdLevel: real("threshold_level"),
  timestamp: timestamp("timestamp").defaultNow()
});

export const insertFloodRiskSchema = createInsertSchema(floodRisks).omit({
  id: true,
  timestamp: true
});

// Alert Model
export const alerts = table("alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  riskLevel: text("risk_level").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  isRead: true,
  createdAt: true
});

// Road Status Model
export const roads = table("roads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startLat: real("start_lat").notNull(),
  startLong: real("start_long").notNull(),
  endLat: real("end_lat").notNull(),
  endLong: real("end_long").notNull(),
  status: text("status").notNull(), // 'UNDER_FLOOD', 'NEAR_FLOOD', 'SAFE'
  distance: real("distance"), // in km
  lastUpdated: timestamp("last_updated").defaultNow()
});

export const insertRoadSchema = createInsertSchema(roads).omit({
  id: true,
  lastUpdated: true
});

// River Level Model
export const riverLevels = table("river_levels", {
  id: serial("id").primaryKey(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  level: real("level").notNull(), // in meters
  criticalThreshold: real("critical_threshold"),
  timestamp: timestamp("timestamp").defaultNow()
});

export const insertRiverLevelSchema = createInsertSchema(riverLevels).omit({
  id: true,
  timestamp: true
});

// Export Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type FloodRisk = typeof floodRisks.$inferSelect;
export type InsertFloodRisk = z.infer<typeof insertFloodRiskSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type Road = typeof roads.$inferSelect;
export type InsertRoad = z.infer<typeof insertRoadSchema>;

export type RiverLevel = typeof riverLevels.$inferSelect;
export type InsertRiverLevel = z.infer<typeof insertRiverLevelSchema>;
