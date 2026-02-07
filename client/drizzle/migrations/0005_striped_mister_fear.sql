CREATE TABLE "collaboration_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"user_id" integer,
	"entry_type" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collaboration_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"created_by" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"memory" jsonb DEFAULT '{}' NOT NULL,
	"latest_snapshot" jsonb,
	"last_processed_message_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collaboration_entries" ADD CONSTRAINT "collaboration_entries_session_id_collaboration_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."collaboration_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_entries" ADD CONSTRAINT "collaboration_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_sessions" ADD CONSTRAINT "collaboration_sessions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_sessions" ADD CONSTRAINT "collaboration_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collab_entries_session_idx" ON "collaboration_entries" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "collab_entries_type_idx" ON "collaboration_entries" USING btree ("entry_type");--> statement-breakpoint
CREATE INDEX "collab_sessions_conv_idx" ON "collaboration_sessions" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "collab_sessions_active_idx" ON "collaboration_sessions" USING btree ("is_active");