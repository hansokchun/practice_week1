CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, bio, avatar_url)
  VALUES (
    new.id,
    coalesce(
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Guest'
    ),
    '',
    ''
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
