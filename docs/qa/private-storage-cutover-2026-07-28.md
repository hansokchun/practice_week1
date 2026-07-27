# Private Storage Cutover QA

Date: 2026-07-28  
Project: `pqczcponriukilrtpbdl`  
Production: `https://practice-week1-cws.pages.dev`

## Result

- Bucket privacy: private
- Photo rows: 21
- Rows missing `storage_path`: 0
- Storage objects: 31
- Storage policies: 4
- Auth accounts preserved: 2
- Profiles preserved: 2
- Sample data: retained because it was already compatible and useful as QA fixtures

No Auth user, profile, schema, policy, secret, or deployment setting was deleted.

## Role Checks

### Anonymous

- Public photo rows visible: 6
- Private photo rows visible: 0
- Private location rows visible: 0
- Public photo objects visible: 6
- Private photo objects visible: 0

### Owner

- Owned private row visible: yes
- Owned private object visible: yes
- Owned private location visible: yes

### Other Authenticated User

- Target owner's private rows: 0
- Target owner's private objects: 0
- Target owner's private locations: 0

## HTTP Checks

- Legacy public URL for a public object: HTTP 400
- Legacy public URL for a private object: HTTP 400
- Anonymous public signed URL: HTTP 200
- Anonymous private signed URL: HTTP 400

## Browser Check

- Logged-out Production Explore: public photos visible
- Login control visible: yes
- Public map and discovery panel visible: yes
- Signed Storage images rendered: yes
- User-facing load error: none

The browser check found legacy album-cover URLs still being rendered on public profile surfaces. Album reads now rehydrate those covers with 15-minute signed URLs, with a regression test covering both legacy public and signed URL path extraction.

## Remaining P0

- Real-device authentication QA on iOS Safari and Android Chrome
- Leaked-password protection after upgrading from the Supabase Free plan
