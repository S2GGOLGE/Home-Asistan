import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  real,
  timestamp,
} from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
});

export const users = pgTable("users", {
  id: serial().primaryKey(),
  username: text().notNull().unique(),
  email: text(),
  passwordHash: text("password_hash").notNull(),
  salt: text(),
  role: text(),
  roleId: integer("role_id").references(() => roles.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const logs = pgTable("logs", {
  id: serial().primaryKey(),
  level: text(),
  message: text(),
  source: text(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const systemLogs = pgTable("system_logs", {
  id: serial().primaryKey(),
  eventId: text("event_id").notNull().default(""),
  serviceName: text("service_name").notNull().default("System"),
  eventType: text("event_type").notNull().default("System"),
  logLevel: text("log_level").notNull().default("Information"),
  message: text().notNull().default(""),
  stackTrace: text("stack_trace"),
  source: text(),
  userId: integer("user_id"),
  ipAddress: text("ip_address"),
  machineName: text("machine_name").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
  isArchived: boolean("is_archived").notNull().default(false),
});

export const rooms = pgTable("rooms", {
  id: serial().primaryKey(),
  name: text().notNull(),
  icon: text().default("fa-door-open"),
  description: text(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const devices = pgTable("devices", {
  id: serial().primaryKey(),
  name: text().notNull(),
  type: text(),
  status: boolean().default(false),
  room: text(),
  feature: text(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sensors = pgTable("sensors", {
  id: serial().primaryKey(),
  name: text().notNull(),
  type: text().notNull().default("temperature"),
  room: text(),
  location: text(),
  value: real().notNull().default(0),
  unit: text(),
  status: text().notNull().default("online"),
  batteryLevel: integer("battery_level"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const automations = pgTable("automations", {
  id: serial().primaryKey(),
  name: text().notNull(),
  description: text(),
  triggerCondition: text("trigger_condition"),
  actionDescription: text("action_description"),
  isActive: boolean("is_active").notNull().default(true),
  lastRun: timestamp("last_run"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial().primaryKey(),
  title: text().notNull(),
  message: text().notNull().default(""),
  priority: text().notNull().default("info"),
  category: text().notNull().default("system"),
  isRead: boolean("is_read").notNull().default(false),
  userId: integer("user_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const commands = pgTable("commands", {
  id: serial().primaryKey(),
  userId: integer("user_id"),
  commandText: text("command_text"),
  responseText: text("response_text"),
  status: text(),
  createdAt: timestamp("created_at").defaultNow(),
});
