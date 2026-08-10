CREATE OR REPLACE FUNCTION public.set_photo_like(target_photo_id text, should_like boolean)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  new_like_count integer;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  PERFORM 1
  FROM public.photos
  WHERE id = target_photo_id
    AND (
      owner_id = current_user_id
      OR visibility IN ('public', 'link')
      OR shared IS TRUE
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Photo is not available' USING ERRCODE = '42501';
  END IF;

  IF should_like THEN
    INSERT INTO public.user_likes (user_id, photo_id)
    VALUES (current_user_id, target_photo_id)
    ON CONFLICT (user_id, photo_id) DO NOTHING;
  ELSE
    DELETE FROM public.user_likes
    WHERE photo_id = target_photo_id
      AND user_id = current_user_id;
  END IF;

  SELECT count(*)::integer
  INTO new_like_count
  FROM public.user_likes
  WHERE photo_id = target_photo_id;

  UPDATE public.photos
  SET liked = new_like_count
  WHERE id = target_photo_id;

  RETURN new_like_count;
END;
$$;

REVOKE ALL ON FUNCTION public.set_photo_like(text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_photo_like(text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_photo_like(text, boolean) TO authenticated;

UPDATE public.photos AS photo
SET liked = (
  SELECT count(*)::integer
  FROM public.user_likes AS user_like
  WHERE user_like.photo_id = photo.id
);
