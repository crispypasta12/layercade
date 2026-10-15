-- Lock down the task notification functions.
--
-- notify_task_assignment and send_due_task_reminders are SECURITY DEFINER and
-- were executable by anon/authenticated through /rest/v1/rpc/*, so anyone could
-- trigger reminder emails. Neither needs to be callable from the API:
--   * notify_task_assignment only runs as the task_assignment_trigger on
--     public.tasks. Postgres checks EXECUTE when a trigger is created, not each
--     time it fires, so revoking it doesn't stop the trigger.
--   * send_due_task_reminders only runs from the daily-task-reminders pg_cron
--     job, which runs as postgres (the owner).
--
-- All three functions also get a fixed, empty search_path (they already use
-- fully qualified names: public., vault., net.), clearing the advisor's
-- "function_search_path_mutable" warning.
--
-- is_team_member() and place_order() stay callable on purpose: they're the RLS
-- helper and the storefront checkout.

begin;

revoke execute on function public.notify_task_assignment()   from public, anon, authenticated;
revoke execute on function public.send_due_task_reminders()  from public, anon, authenticated;

alter function public.notify_task_assignment()  set search_path = '';
alter function public.send_due_task_reminders() set search_path = '';
alter function public.set_updated_at()          set search_path = '';

commit;
