# Supabase Backup Restore Rehearsal

**Date:** 2026-07-27
**Environment:** Disposable local Supabase database
**Status:** Pass

## Scope

The encrypted logical backup created on 2026-07-26 was restored outside the live Supabase project. The rehearsal did not change project `pqczcponriukilrtpbdl`, create a billed hosted project, or expose the database URL, encryption passphrase, row contents, or private object paths.

## Results

| Check | Result |
| --- | --- |
| Encrypted archive SHA-256 | Pass before decryption |
| Internal roles, schema, and data manifest hashes | Pass |
| Restore transaction | Roles, schema, and data applied with `ON_ERROR_STOP=1` in one transaction |
| Public schema | 7 tables |
| RLS policies | 24 policies |
| Publication trigger | 1 non-internal public trigger |
| RLS coverage | 7 public tables with RLS enabled |
| Data verification | Safe aggregate counts queried successfully; row contents were not printed or retained in project records |
| Cleanup | No disposable container, database volume, decrypted archive, or temporary SQL directory remained after completion |

## Recovery Boundary

The logical database backup includes Storage metadata but not the binary photo objects. A database restore can reconstruct records, relationships, policies, and object metadata; it cannot recover a deleted Storage object by itself. Original photo objects still require a separate inventory and recovery plan.

## Decision

The manual database backup and recovery procedure is operationally rehearsed. The P0 environment, secret ownership, backup/recovery, and migration rollback gate can be marked complete. Repeat the rehearsal after material schema changes or backup-tool changes.
