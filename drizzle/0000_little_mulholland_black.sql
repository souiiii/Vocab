CREATE TABLE "annotations" (
	"id" text PRIMARY KEY NOT NULL,
	"article_id" text NOT NULL,
	"start" integer NOT NULL,
	"end" integer NOT NULL,
	"quote" text NOT NULL,
	"note" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "anchor_range" CHECK ("annotations"."start" >= 0 AND "annotations"."end" > "annotations"."start")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"source" text NOT NULL,
	"url" text NOT NULL,
	"published" text NOT NULL,
	"category" text NOT NULL,
	"content" text NOT NULL,
	"status" text NOT NULL,
	"progress" real NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "article_progress" CHECK ("articles"."progress" >= 0 AND "articles"."progress" <= 100)
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"question_id" text NOT NULL,
	"response" text NOT NULL,
	"evidence" text NOT NULL,
	"correct" boolean,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"format" text NOT NULL,
	"due_at" text NOT NULL,
	"interval" real NOT NULL,
	"ease" real NOT NULL,
	"repetitions" integer NOT NULL,
	"lapses" integer NOT NULL,
	"version" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" text PRIMARY KEY NOT NULL,
	"term" text NOT NULL,
	"normalized" text NOT NULL,
	"kind" text NOT NULL,
	"meaning" text NOT NULL,
	"pos" text NOT NULL,
	"context_meaning" text NOT NULL,
	"sentence" text NOT NULL,
	"article_id" text,
	"synonyms" text NOT NULL,
	"antonyms" text NOT NULL,
	"collocations" text NOT NULL,
	"forms" text NOT NULL,
	"register" text NOT NULL,
	"pronunciation" text NOT NULL,
	"examples" text NOT NULL,
	"tags" text NOT NULL,
	"status" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"lesson_id" text PRIMARY KEY NOT NULL,
	"completed" boolean NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"group_name" text NOT NULL,
	"description" text NOT NULL,
	"body" text NOT NULL,
	"examples" jsonb NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mistakes" (
	"id" text PRIMARY KEY NOT NULL,
	"attempt_id" text,
	"topic" text NOT NULL,
	"prompt" text NOT NULL,
	"response" text NOT NULL,
	"feedback" text NOT NULL,
	"subjective" boolean NOT NULL,
	"resolved" boolean NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" text PRIMARY KEY NOT NULL,
	"article_id" text,
	"lesson_id" text,
	"type" text NOT NULL,
	"prompt" text NOT NULL,
	"options" jsonb NOT NULL,
	"answer" text NOT NULL,
	"explanation" text NOT NULL,
	"evidence" text NOT NULL,
	"subjective" boolean NOT NULL,
	"ai_generated" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"quality" integer NOT NULL,
	"response" text NOT NULL,
	"reviewed_at" text NOT NULL,
	"interval" real NOT NULL,
	CONSTRAINT "review_quality" CHECK ("reviews"."quality" >= 0 AND "reviews"."quality" <= 5)
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistakes" ADD CONSTRAINT "mistakes_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "card_identity" ON "cards" USING btree ("entry_id","format");--> statement-breakpoint
CREATE UNIQUE INDEX "entry_identity" ON "entries" USING btree ("normalized","kind");