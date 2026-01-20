DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider') THEN
		CREATE TYPE "public"."provider" AS ENUM('google', 'outlook', 'slack');
	END IF;
END $$;
--> statement-breakpoint
CREATE TABLE "provider_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider" "provider",
	"provider_account_id" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"created_at" timestamp NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "full_name" TO "name";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" varchar(255);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" timestamp;
--> statement-breakpoint
UPDATE "users"
SET "email" = CONCAT('placeholder_', "id", '@example.com')
WHERE "email" IS NULL;
--> statement-breakpoint
UPDATE "users"
SET "created_at" = NOW()
WHERE "created_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "provider_accounts" ADD CONSTRAINT "provider_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");