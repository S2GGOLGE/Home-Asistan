CREATE TABLE "automations" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"description" text,
	"trigger_condition" text,
	"action_description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "commands" (
	"id" serial PRIMARY KEY,
	"user_id" integer,
	"command_text" text,
	"response_text" text,
	"status" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"type" text,
	"status" boolean DEFAULT false,
	"room" text,
	"feature" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"id" serial PRIMARY KEY,
	"level" text,
	"message" text,
	"source" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"priority" text DEFAULT 'info' NOT NULL,
	"category" text DEFAULT 'system' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"user_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"icon" text DEFAULT 'fa-door-open',
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sensors" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"type" text DEFAULT 'temperature' NOT NULL,
	"room" text,
	"location" text,
	"value" real DEFAULT 0 NOT NULL,
	"unit" text,
	"status" text DEFAULT 'online' NOT NULL,
	"battery_level" integer,
	"last_updated" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_logs" (
	"id" serial PRIMARY KEY,
	"event_id" text DEFAULT '' NOT NULL,
	"service_name" text DEFAULT 'System' NOT NULL,
	"event_type" text DEFAULT 'System' NOT NULL,
	"log_level" text DEFAULT 'Information' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"stack_trace" text,
	"source" text,
	"user_id" integer,
	"ip_address" text,
	"machine_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"is_archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"username" text NOT NULL UNIQUE,
	"email" text,
	"password_hash" text NOT NULL,
	"salt" text,
	"role" text,
	"role_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id");