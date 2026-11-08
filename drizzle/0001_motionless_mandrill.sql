CREATE TABLE "favorite_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"list_id" text NOT NULL,
	"imdb_id" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "favorite_entry_list_imdb_unique" UNIQUE("list_id","imdb_id")
);
--> statement-breakpoint
CREATE TABLE "favorites_list" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	CONSTRAINT "favorites_list_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "favorite_entry" ADD CONSTRAINT "favorite_entry_list_id_favorites_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."favorites_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites_list" ADD CONSTRAINT "favorites_list_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;