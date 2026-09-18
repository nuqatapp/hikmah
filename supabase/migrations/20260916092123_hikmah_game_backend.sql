-- Private, server-authoritative game data. No client Data API access.
CREATE SCHEMA hikmah;
REVOKE ALL ON SCHEMA hikmah FROM PUBLIC, anon, authenticated;
CREATE ROLE hikmah_server NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT hikmah_server TO postgres;
GRANT USAGE ON SCHEMA hikmah TO hikmah_server;
SET search_path = hikmah, pg_catalog;


CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"username" text,
	"country" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"age_group" text DEFAULT '' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"avatar" text,
 "banned" integer NOT NULL DEFAULT 0 CHECK (banned IN (0,1)),
 "auth_user_id" uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
	"created_at" bigint NOT NULL
);

CREATE TABLE "content" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"locale" text NOT NULL,
	"prompt" text NOT NULL,
	"answer" text NOT NULL,
	"choices" text DEFAULT '[]' NOT NULL,
	"clues" text DEFAULT '[]' NOT NULL,
	"explanation" text DEFAULT '' NOT NULL,
	"active" integer DEFAULT 1 NOT NULL
);

CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);

CREATE TABLE "rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"kind" text NOT NULL,
	"locale" text NOT NULL,
	"mode" text NOT NULL,
	"host" text NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"round" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);

CREATE TABLE "rounds" (
	"id" text PRIMARY KEY NOT NULL,
	"room" text NOT NULL,
	"number" integer NOT NULL,
	"content_id" text NOT NULL,
	"snapshot" text NOT NULL,
	"started_at" bigint,
	"ended_at" bigint,
	"winner" text,
	"outcome" text,
	"nonce" text,
	FOREIGN KEY ("room") REFERENCES "rooms"("id") ON UPDATE no action ON DELETE cascade
);

CREATE TABLE "members" (
	"room" text NOT NULL,
	"user" text NOT NULL,
	"joined_at" bigint NOT NULL,
	"last_seen" bigint NOT NULL,
	"left_at" bigint,
	PRIMARY KEY("room", "user"),
	FOREIGN KEY ("room") REFERENCES "rooms"("id") ON UPDATE no action ON DELETE cascade
);

CREATE TABLE "attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"round" text NOT NULL,
	"user" text NOT NULL,
	"correct" integer NOT NULL,
	"answer" text NOT NULL,
	"elapsed" integer NOT NULL,
	"created_at" bigint NOT NULL,
	FOREIGN KEY ("round") REFERENCES "rounds"("id") ON UPDATE no action ON DELETE cascade
);

CREATE TABLE "wallet" (
	"id" text PRIMARY KEY NOT NULL,
	"user" text NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" bigint NOT NULL
);

CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"user" text,
	"content_id" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" bigint NOT NULL
);

CREATE UNIQUE INDEX "attempt_round_user" ON "attempts" ("round","user");

CREATE INDEX "attempts_user_date" ON "attempts" ("user","created_at");

CREATE INDEX "content_kind_locale" ON "content" ("kind","locale","active");

CREATE INDEX "members_user" ON "members" ("user");

CREATE UNIQUE INDEX "profiles_username" ON "profiles" ("username");

CREATE INDEX "reports_status" ON "reports" ("status");

CREATE UNIQUE INDEX "rooms_code_unique" ON "rooms" ("code");

CREATE INDEX "rooms_status_mode" ON "rooms" ("status","mode");

CREATE UNIQUE INDEX "rounds_room_number" ON "rounds" ("room","number");

CREATE INDEX "wallet_user" ON "wallet" ("user");

CREATE INDEX rounds_content_id ON rounds(content_id);

CREATE INDEX rounds_winner ON rounds(winner);

CREATE INDEX reports_content_id ON reports(content_id);

CREATE INDEX wallet_user_created ON wallet("user",created_at DESC);

ALTER TABLE rooms ADD CONSTRAINT rooms_rules CHECK (kind IN ('mcq','letters','cryptogram') AND locale IN ('en','ar') AND mode IN ('solo','multi') AND status IN ('waiting','active','finished','abandoned') AND ((mode='multi' AND total=5) OR (mode='solo' AND total BETWEEN 1 AND 10)));
ALTER TABLE content ADD CONSTRAINT content_rules CHECK (kind IN ('mcq','letters','cryptogram') AND locale IN ('en','ar') AND active IN (0,1));
ALTER TABLE attempts ADD CONSTRAINT attempts_correct CHECK (correct IN (0,1) AND elapsed >= 0);
ALTER TABLE rounds ADD CONSTRAINT rounds_number CHECK (number BETWEEN 1 AND 10);
ALTER TABLE rounds ADD CONSTRAINT rounds_content_fk FOREIGN KEY (content_id) REFERENCES content(id);
ALTER TABLE reports ADD CONSTRAINT reports_content_fk FOREIGN KEY (content_id) REFERENCES content(id);
ALTER TABLE wallet ADD CONSTRAINT wallet_profile_fk FOREIGN KEY ("user") REFERENCES profiles(id) ON DELETE CASCADE;
CREATE TABLE server_credentials (
 id text PRIMARY KEY,
 token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz
);
REVOKE ALL ON ALL TABLES IN SCHEMA hikmah FROM PUBLIC, anon, authenticated;


ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON profiles TO hikmah_server;
CREATE POLICY game_server ON profiles FOR ALL TO hikmah_server USING (true) WITH CHECK (true);

ALTER TABLE content ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON content TO hikmah_server;
CREATE POLICY game_server ON content FOR ALL TO hikmah_server USING (true) WITH CHECK (true);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON site_settings TO hikmah_server;
CREATE POLICY game_server ON site_settings FOR ALL TO hikmah_server USING (true) WITH CHECK (true);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON rooms TO hikmah_server;
CREATE POLICY game_server ON rooms FOR ALL TO hikmah_server USING (true) WITH CHECK (true);

ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON rounds TO hikmah_server;
CREATE POLICY game_server ON rounds FOR ALL TO hikmah_server USING (true) WITH CHECK (true);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON members TO hikmah_server;
CREATE POLICY game_server ON members FOR ALL TO hikmah_server USING (true) WITH CHECK (true);

ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON attempts TO hikmah_server;
CREATE POLICY game_server ON attempts FOR ALL TO hikmah_server USING (true) WITH CHECK (true);

ALTER TABLE wallet ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON wallet TO hikmah_server;
CREATE POLICY game_server ON wallet FOR ALL TO hikmah_server USING (true) WITH CHECK (true);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON reports TO hikmah_server;
CREATE POLICY game_server ON reports FOR ALL TO hikmah_server USING (true) WITH CHECK (true);

-- Only the privileged Edge connection can check the server token hash.
ALTER TABLE server_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON server_credentials FROM hikmah_server;
ALTER DEFAULT PRIVILEGES IN SCHEMA hikmah REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
RESET search_path;
