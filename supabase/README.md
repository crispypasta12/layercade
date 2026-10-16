# Supabase

- `migrations/` — every schema change, applied in filename order. New changes go here.
- `schema/schema.sql` — a snapshot of the whole live schema: tables, policies, functions, triggers, the cron job, storage buckets and Vault secret names. It's for reading, not running. Regenerate it with `schema/snapshot_query.sql` (paste into the SQL editor, save the result over `schema.sql`) after a migration lands.
- `functions/` — edge functions, deployed under the same names.

## Edge functions

| Function | Called by | JWT check | Secrets / env |
| --- | --- | --- | --- |
| `send-order-confirmation` | storefront checkout | off | `RESEND_API_KEY`, `ALLOWED_ORIGINS` |
| `idea-preview` | admin Ideas board | on | `ALLOWED_ORIGINS` |
| `notify-task-assignment` | `task_assignment_trigger` on `tasks` | off (uses `X-Notify-Secret`) | `RESEND_API_KEY`, `TASK_NOTIFY_SECRET`, optional `ADMIN_URL` |
| `send-task-reminder` | `send_due_task_reminders()`, daily cron at 03:00 UTC | off (uses `X-Reminder-Secret`) | `RESEND_API_KEY`, `TASK_REMINDER_SECRET`, optional `ADMIN_URL` |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase.

The two task functions are called from the database, which reads the matching secret from Vault (`task_notify_secret`, `task_reminder_secret`). Each Vault value must equal the function's env secret, or every call returns 401.

`ADMIN_URL` defaults to `https://www.layercade.com/admin`; the emails link to `<ADMIN_URL>/tasks?mine=1`.
