-- Ikkyee live Supabase schema baseline.
-- Generated with Supabase CLI 2.109.1; contains no table data.




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."apply_photo_location_privacy"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  source_lat double precision;
  source_lng double precision;
begin
  if new.lat is not null and new.lng is not null
     and (tg_op = 'INSERT' or new.lat is distinct from old.lat or new.lng is distinct from old.lng) then
    insert into public.photo_private_locations (photo_id, owner_id, lat, lng)
    values (new.id, new.owner_id, new.lat, new.lng)
    on conflict (photo_id) do update
    set owner_id = excluded.owner_id,
        lat = excluded.lat,
        lng = excluded.lng,
        updated_at = now();
  end if;

  select lat, lng into source_lat, source_lng
  from public.photo_private_locations
  where photo_id = new.id;

  if new.visibility in ('public', 'link') or new.shared is true then
    if new.location_precision = 'hidden' then
      new.lat := null;
      new.lng := null;
    elsif source_lat is not null and source_lng is not null then
      if new.location_precision = 'approximate' then
        new.lat := round(source_lat::numeric, 2)::double precision;
        new.lng := round(source_lng::numeric, 2)::double precision;
      else
        new.lat := source_lat;
        new.lng := source_lng;
      end if;
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."apply_photo_location_privacy"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_like"("target_photo_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  update photos
  set liked = greatest(coalesce(liked, 0) - 1, 0)
  where id = target_photo_id;
end;
$$;


ALTER FUNCTION "public"."decrement_like"("target_photo_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  insert into public.profiles (id, nickname, bio, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Guest'
    ),
    '',
    ''
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_like"("target_photo_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  update photos
  set liked = coalesce(liked, 0) + 1
  where id = target_photo_id;
end;
$$;


ALTER FUNCTION "public"."increment_like"("target_photo_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_photo_like"("target_photo_id" "text", "should_like" boolean) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  current_user_id uuid := auth.uid();
  new_like_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform 1
  from public.photos
  where id = target_photo_id
    and (
      owner_id = current_user_id
      or visibility in ('public', 'link')
      or shared is true
    )
  for update;

  if not found then
    raise exception 'Photo is not available' using errcode = '42501';
  end if;

  if should_like then
    insert into public.user_likes (user_id, photo_id)
    values (current_user_id, target_photo_id)
    on conflict (user_id, photo_id) do nothing;
  else
    delete from public.user_likes
    where photo_id = target_photo_id
      and user_id = current_user_id;
  end if;

  select count(*)::integer
  into new_like_count
  from public.user_likes
  where photo_id = target_photo_id;

  update public.photos
  set liked = new_like_count
  where id = target_photo_id;

  return new_like_count;
end;
$$;


ALTER FUNCTION "public"."set_photo_like"("target_photo_id" "text", "should_like" boolean) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."album_photos" (
    "album_id" "uuid" NOT NULL,
    "photo_id" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "day_label" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."album_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."albums" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "visibility" "text" DEFAULT 'private'::"text" NOT NULL,
    "cover_url" "text",
    "date_start" "text",
    "date_end" "text",
    "photo_count" integer DEFAULT 0 NOT NULL,
    "share_token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(12), 'hex'::"text"),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "albums_photo_count_check" CHECK (("photo_count" >= 0)),
    CONSTRAINT "albums_visibility_check" CHECK (("visibility" = ANY (ARRAY['private'::"text", 'link'::"text", 'public'::"text"])))
);


ALTER TABLE "public"."albums" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" bigint NOT NULL,
    "photo_id" "text",
    "text" "text" NOT NULL,
    "date" timestamp with time zone DEFAULT "now"(),
    "author_id" "uuid"
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."comments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."comments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."comments_id_seq" OWNED BY "public"."comments"."id";



CREATE TABLE IF NOT EXISTS "public"."photo_private_locations" (
    "photo_id" "text" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "lat" double precision NOT NULL,
    "lng" double precision NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."photo_private_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."photos" (
    "id" "text" NOT NULL,
    "url" "text",
    "date" "text",
    "title" "text",
    "description" "text",
    "lat" double precision,
    "lng" double precision,
    "liked" integer DEFAULT 0,
    "shared" boolean DEFAULT false,
    "owner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "album" "text",
    "album_id" "uuid",
    "visibility" "text" DEFAULT 'private'::"text" NOT NULL,
    "geo_source" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "storage_path" "text",
    "location_precision" "text" DEFAULT 'hidden'::"text" NOT NULL,
    "location_assignment_skipped" boolean DEFAULT false NOT NULL,
    CONSTRAINT "photos_geo_source_check" CHECK (("geo_source" = ANY (ARRAY['exif'::"text", 'manual'::"text", 'gpx'::"text", 'unknown'::"text"]))),
    CONSTRAINT "photos_location_precision_check" CHECK (("location_precision" = ANY (ARRAY['exact'::"text", 'approximate'::"text", 'hidden'::"text"]))),
    CONSTRAINT "photos_visibility_check" CHECK (("visibility" = ANY (ARRAY['private'::"text", 'link'::"text", 'public'::"text"])))
);


ALTER TABLE "public"."photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "nickname" "text",
    "bio" "text" DEFAULT ''::"text" NOT NULL,
    "avatar_url" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_likes" (
    "user_id" "uuid" NOT NULL,
    "photo_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_likes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."comments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."comments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."album_photos"
    ADD CONSTRAINT "album_photos_pkey" PRIMARY KEY ("album_id", "photo_id");



ALTER TABLE ONLY "public"."albums"
    ADD CONSTRAINT "albums_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."albums"
    ADD CONSTRAINT "albums_share_token_key" UNIQUE ("share_token");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."photo_private_locations"
    ADD CONSTRAINT "photo_private_locations_pkey" PRIMARY KEY ("photo_id");



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_nickname_key" UNIQUE ("nickname");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_likes"
    ADD CONSTRAINT "user_likes_pkey" PRIMARY KEY ("user_id", "photo_id");



CREATE INDEX "album_photos_album_sort_idx" ON "public"."album_photos" USING "btree" ("album_id", "sort_order");



CREATE INDEX "album_photos_photo_id_idx" ON "public"."album_photos" USING "btree" ("photo_id");



CREATE INDEX "albums_owner_created_idx" ON "public"."albums" USING "btree" ("owner_id", "created_at" DESC);



CREATE INDEX "albums_visibility_created_idx" ON "public"."albums" USING "btree" ("visibility", "created_at" DESC);



CREATE INDEX "comments_author_id_idx" ON "public"."comments" USING "btree" ("author_id");



CREATE INDEX "comments_photo_id_idx" ON "public"."comments" USING "btree" ("photo_id");



CREATE INDEX "idx_user_likes_photo" ON "public"."user_likes" USING "btree" ("photo_id");



CREATE INDEX "idx_user_likes_user" ON "public"."user_likes" USING "btree" ("user_id");



CREATE INDEX "photo_private_locations_owner_id_idx" ON "public"."photo_private_locations" USING "btree" ("owner_id");



CREATE INDEX "photos_album_id_idx" ON "public"."photos" USING "btree" ("album_id");



CREATE INDEX "photos_owner_created_idx" ON "public"."photos" USING "btree" ("owner_id", "created_at" DESC);



CREATE INDEX "photos_owner_id_idx" ON "public"."photos" USING "btree" ("owner_id");



CREATE INDEX "photos_visibility_idx" ON "public"."photos" USING "btree" ("visibility");



CREATE OR REPLACE TRIGGER "photos_apply_location_privacy" BEFORE INSERT OR UPDATE ON "public"."photos" FOR EACH ROW EXECUTE FUNCTION "public"."apply_photo_location_privacy"();



ALTER TABLE ONLY "public"."album_photos"
    ADD CONSTRAINT "album_photos_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."album_photos"
    ADD CONSTRAINT "album_photos_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."albums"
    ADD CONSTRAINT "albums_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photo_private_locations"
    ADD CONSTRAINT "photo_private_locations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photo_private_locations"
    ADD CONSTRAINT "photo_private_locations_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "photos_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "photos_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_likes"
    ADD CONSTRAINT "user_likes_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_likes"
    ADD CONSTRAINT "user_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."album_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "album_photos_delete_owner_album" ON "public"."album_photos" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."albums" "a"
  WHERE (("a"."id" = "album_photos"."album_id") AND ("a"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "album_photos_insert_owner_album" ON "public"."album_photos" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."albums" "a"
  WHERE (("a"."id" = "album_photos"."album_id") AND ("a"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "album_photos_select_owner_or_visible_album" ON "public"."album_photos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."albums" "a"
  WHERE (("a"."id" = "album_photos"."album_id") AND (("a"."owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("a"."visibility" = ANY (ARRAY['public'::"text", 'link'::"text"])))))));



CREATE POLICY "album_photos_update_owner_album" ON "public"."album_photos" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."albums" "a"
  WHERE (("a"."id" = "album_photos"."album_id") AND ("a"."owner_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."albums" "a"
  WHERE (("a"."id" = "album_photos"."album_id") AND ("a"."owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."albums" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "albums_delete_owner" ON "public"."albums" FOR DELETE USING (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "albums_insert_owner" ON "public"."albums" FOR INSERT WITH CHECK (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "albums_select_owner_or_visible" ON "public"."albums" FOR SELECT USING ((("owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("visibility" = ANY (ARRAY['public'::"text", 'link'::"text"]))));



CREATE POLICY "albums_update_owner" ON "public"."albums" FOR UPDATE USING (("owner_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comments_insert_visible_photo" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK ((("author_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."photos" "p"
  WHERE (("p"."id" = "comments"."photo_id") AND (("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("p"."visibility" = ANY (ARRAY['public'::"text", 'link'::"text"])) OR ("p"."shared" IS TRUE)))))));



CREATE POLICY "comments_select_visible_photo" ON "public"."comments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."photos" "p"
  WHERE (("p"."id" = "comments"."photo_id") AND (("p"."owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("p"."visibility" = ANY (ARRAY['public'::"text", 'link'::"text"])) OR ("p"."shared" IS TRUE))))));



ALTER TABLE "public"."photo_private_locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "photo_private_locations_delete_owner" ON "public"."photo_private_locations" FOR DELETE TO "authenticated" USING (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "photo_private_locations_insert_owner" ON "public"."photo_private_locations" FOR INSERT TO "authenticated" WITH CHECK (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "photo_private_locations_select_owner" ON "public"."photo_private_locations" FOR SELECT TO "authenticated" USING (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "photo_private_locations_update_owner" ON "public"."photo_private_locations" FOR UPDATE TO "authenticated" USING (("owner_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "photos_delete_owner" ON "public"."photos" FOR DELETE TO "authenticated" USING (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "photos_insert_owner" ON "public"."photos" FOR INSERT TO "authenticated" WITH CHECK (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "photos_select_owner_or_visible" ON "public"."photos" FOR SELECT USING ((("owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("visibility" = ANY (ARRAY['public'::"text", 'link'::"text"])) OR ("shared" IS TRUE)));



CREATE POLICY "photos_update_owner" ON "public"."photos" FOR UPDATE TO "authenticated" USING (("owner_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_likes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_likes_delete_own" ON "public"."user_likes" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_likes_insert_own" ON "public"."user_likes" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_likes_select_own" ON "public"."user_likes" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."apply_photo_location_privacy"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_photo_location_privacy"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."decrement_like"("target_photo_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."decrement_like"("target_photo_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_like"("target_photo_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_like"("target_photo_id" "text") TO "service_role";


REVOKE ALL ON FUNCTION "public"."set_photo_like"("target_photo_id" "text", "should_like" boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."set_photo_like"("target_photo_id" "text", "should_like" boolean) FROM "anon";
GRANT ALL ON FUNCTION "public"."set_photo_like"("target_photo_id" "text", "should_like" boolean) TO "authenticated";


















GRANT ALL ON TABLE "public"."album_photos" TO "anon";
GRANT ALL ON TABLE "public"."album_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."album_photos" TO "service_role";



GRANT ALL ON TABLE "public"."albums" TO "anon";
GRANT ALL ON TABLE "public"."albums" TO "authenticated";
GRANT ALL ON TABLE "public"."albums" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."comments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."comments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."comments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."photo_private_locations" TO "anon";
GRANT ALL ON TABLE "public"."photo_private_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."photo_private_locations" TO "service_role";



GRANT ALL ON TABLE "public"."photos" TO "anon";
GRANT ALL ON TABLE "public"."photos" TO "authenticated";
GRANT ALL ON TABLE "public"."photos" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_likes" TO "anon";
GRANT ALL ON TABLE "public"."user_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."user_likes" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
