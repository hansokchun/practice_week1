-- Run manually in the Supabase SQL Editor as the project operator.
-- The final result is aggregate-only. Do not export or retain the CTE row sets.
-- Cohorts with fewer than five eligible sign-ups are suppressed.

with eligible_signups as (
    select
        id as user_id,
        created_at as signed_up_at,
        date_trunc('week', created_at at time zone 'UTC')::date as cohort_week
    from auth.users
    where coalesce(is_anonymous, false) = false
      and created_at < now() - interval '7 days'
),
first_uploads as (
    select owner_id as user_id, min(created_at) as first_upload_at
    from public.photos
    where owner_id is not null
    group by owner_id
),
first_albums as (
    select owner_id as user_id, min(created_at) as first_album_at
    from public.albums
    where owner_id is not null
    group by owner_id
),
first_publishes as (
    -- V1 proxy: the schema has photo creation time but no publication timestamp.
    select owner_id as user_id, min(created_at) as first_publish_at
    from public.photos
    where owner_id is not null
      and (visibility = 'public' or coalesce(shared, false) = true)
    group by owner_id
),
first_explore_engagements as (
    select likes.user_id, min(likes.created_at) as first_explore_engagement_at
    from public.user_likes as likes
    join public.photos as photos on photos.id = likes.photo_id
    where photos.owner_id is not null
      and photos.owner_id <> likes.user_id
      and (photos.visibility = 'public' or coalesce(photos.shared, false) = true)
    group by likes.user_id
),
cohort_counts as (
    select
        signups.cohort_week,
        count(*)::integer as signup_count,
        count(uploads.user_id) filter (
            where uploads.first_upload_at >= signups.signed_up_at
              and uploads.first_upload_at < signups.signed_up_at + interval '7 days'
        )::integer as first_upload_count,
        count(albums.user_id) filter (
            where albums.first_album_at >= signups.signed_up_at
              and albums.first_album_at < signups.signed_up_at + interval '7 days'
        )::integer as first_album_count,
        count(publishes.user_id) filter (
            where publishes.first_publish_at >= signups.signed_up_at
              and publishes.first_publish_at < signups.signed_up_at + interval '7 days'
        )::integer as first_publish_count,
        count(explore.user_id) filter (
            where explore.first_explore_engagement_at >= signups.signed_up_at
              and explore.first_explore_engagement_at < signups.signed_up_at + interval '7 days'
        )::integer as explore_engagement_count
    from eligible_signups as signups
    left join first_uploads as uploads on uploads.user_id = signups.user_id
    left join first_albums as albums on albums.user_id = signups.user_id
    left join first_publishes as publishes on publishes.user_id = signups.user_id
    left join first_explore_engagements as explore on explore.user_id = signups.user_id
    group by signups.cohort_week
)
select
    cohort_week,
    signup_count < 5 as suppressed,
    case when signup_count >= 5 then signup_count end as signup_count,
    case when signup_count >= 5 then first_upload_count end as first_upload_count,
    case when signup_count >= 5
        then round(100.0 * first_upload_count / signup_count, 1)
    end as first_upload_rate_pct,
    case when signup_count >= 5 then first_album_count end as first_album_count,
    case when signup_count >= 5
        then round(100.0 * first_album_count / signup_count, 1)
    end as first_album_rate_pct,
    case when signup_count >= 5 then first_publish_count end as first_publish_count,
    case when signup_count >= 5
        then round(100.0 * first_publish_count / signup_count, 1)
    end as first_publish_rate_pct,
    case when signup_count >= 5 then explore_engagement_count end as explore_engagement_count,
    case when signup_count >= 5
        then round(100.0 * explore_engagement_count / signup_count, 1)
    end as explore_engagement_rate_pct
from cohort_counts
order by cohort_week desc;
