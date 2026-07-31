alter table public.profiles
    add column if not exists bio text not null default '',
    add column if not exists avatar_url text not null default '';

update public.profiles as profile
set
    bio = coalesce(auth_user.raw_user_meta_data ->> 'bio', ''),
    avatar_url = regexp_replace(
        coalesce(
            nullif(auth_user.raw_user_meta_data ->> 'avatar_url', ''),
            nullif(auth_user.raw_user_meta_data ->> 'picture', ''),
            ''
        ),
        '^http://',
        'https://'
    )
from auth.users as auth_user
where profile.id = auth_user.id
  and profile.avatar_url = '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
    insert into public.profiles (id, nickname, bio, avatar_url)
    values (
        new.id,
        coalesce(
            nullif(new.raw_user_meta_data ->> 'nickname', ''),
            nullif(new.raw_user_meta_data ->> 'full_name', ''),
            nullif(new.raw_user_meta_data ->> 'name', ''),
            split_part(coalesce(new.email, ''), '@', 1),
            'Guest'
        ),
        coalesce(new.raw_user_meta_data ->> 'bio', ''),
        regexp_replace(
            coalesce(
                nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
                nullif(new.raw_user_meta_data ->> 'picture', ''),
                ''
            ),
            '^http://',
            'https://'
        )
    )
    on conflict (id) do nothing;
    return new;
end;
$$;
