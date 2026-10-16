import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ─── notify-task-assignment ─────────────────────────────────────────────────
   Called by the task_assignment_trigger on public.tasks (via pg_net) with the
   ids of newly added assignees. Assignee ids are public.members ids.
   Deployed with verify_jwt = false; the X-Notify-Secret header is the auth.
   ──────────────────────────────────────────────────────────────────────────── */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const NOTIFY_SECRET = Deno.env.get('TASK_NOTIFY_SECRET') ?? '';
Deno.serve(async (req) => {
  const presented = req.headers.get('x-notify-secret');
  if (!NOTIFY_SECRET || presented !== NOTIFY_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
  try {
    const body = await req.json();
    const { task_title, task_priority, task_due_date, added_assignees } = body;
    if (!added_assignees || added_assignees.length === 0) {
      return new Response(JSON.stringify({ message: 'No new assignees' }), { status: 200 });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const assigneeIds = added_assignees.map((id) => String(id).replace(/"/g, ''));
    const { data: members, error } = await supabase.from('members').select('id, name, email').in('id', assigneeIds);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    if (!members || members.length === 0) return new Response(JSON.stringify({ message: 'No members found' }), { status: 200 });
    const priorityColors = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
    const priorityColor = priorityColors[task_priority] ?? '#6b7280';
    const dueDateText = task_due_date ? `Due: ${task_due_date}` : 'No due date set';
    const emailPromises = members.filter((m) => m.email).map((member) => {
      const html = `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0f172a; color: #f1f5f9; border-radius: 12px; overflow: hidden;"><div style="background: #1e293b; padding: 24px 32px; border-bottom: 1px solid #334155;"><h2 style="margin: 0; font-size: 20px; color: #f8fafc;">&#127919; Layercade Admin</h2><p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Task Assignment Notification</p></div><div style="padding: 28px 32px;"><p style="margin: 0 0 8px; color: #94a3b8; font-size: 14px;">Hi ${member.name},</p><p style="margin: 0 0 24px; font-size: 15px; color: #cbd5e1;">You have been assigned a new task:</p><div style="background: #1e293b; border-radius: 8px; padding: 20px; border-left: 4px solid ${priorityColor};"><h3 style="margin: 0 0 12px; font-size: 18px; color: #f8fafc;">${task_title}</h3><span style="display: inline-block; background: ${priorityColor}22; color: ${priorityColor}; border: 1px solid ${priorityColor}44; border-radius: 4px; padding: 3px 10px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${task_priority}</span><p style="margin: 12px 0 0; color: #94a3b8; font-size: 13px;">&#128197; ${dueDateText}</p></div><p style="margin: 24px 0 0; font-size: 13px; color: #64748b;">Log in to the admin panel to view and manage this task.</p></div></div>`;
      return fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` }, body: JSON.stringify({ from: 'Layercade Admin <sales@layercade.com>', to: [member.email], subject: `New Task Assigned: ${task_title}`, html }) });
    });
    const results = await Promise.allSettled(emailPromises);
    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    return new Response(JSON.stringify({ sent, failed }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
