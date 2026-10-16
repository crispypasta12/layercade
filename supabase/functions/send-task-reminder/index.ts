import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ─── send-task-reminder ─────────────────────────────────────────────────────
   Called by send_due_task_reminders() (daily pg_cron job) for each task due
   tomorrow. Assignee ids are public.members ids.
   Deployed with verify_jwt = false; the X-Reminder-Secret header is the auth.
   ──────────────────────────────────────────────────────────────────────────── */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const REMINDER_SECRET = Deno.env.get('TASK_REMINDER_SECRET') ?? '';
Deno.serve(async (req) => {
  const presented = req.headers.get('x-reminder-secret');
  if (!REMINDER_SECRET || presented !== REMINDER_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
  try {
    const body = await req.json();
    const { task_title, task_priority, task_due_date, assignees } = body;
    if (!assignees || assignees.length === 0) {
      return new Response(JSON.stringify({ message: 'No assignees' }), { status: 200 });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const assigneeIds = assignees.map((id) => String(id).replace(/"/g, ''));
    const { data: members, error } = await supabase.from('members').select('id, name, email').in('id', assigneeIds);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    const recipients = (members ?? []).filter((m) => m.email);
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ message: 'No recipients with email' }), { status: 200 });
    }
    const priorityColors = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
    const priorityColor = priorityColors[task_priority] ?? '#6b7280';
    const emailPromises = recipients.map((member) => {
      const html = `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0f172a; color: #f1f5f9; border-radius: 12px; overflow: hidden;"><div style="background: #1e293b; padding: 24px 32px; border-bottom: 1px solid #334155;"><h2 style="margin: 0; font-size: 20px; color: #f8fafc;">&#9200; Layercade Admin</h2><p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Task Reminder</p></div><div style="padding: 28px 32px;"><p style="margin: 0 0 8px; color: #94a3b8; font-size: 14px;">Hi ${member.name},</p><p style="margin: 0 0 24px; font-size: 15px; color: #cbd5e1;">This task is due tomorrow:</p><div style="background: #1e293b; border-radius: 8px; padding: 20px; border-left: 4px solid ${priorityColor};"><h3 style="margin: 0 0 12px; font-size: 18px; color: #f8fafc;">${task_title}</h3><span style="display: inline-block; background: ${priorityColor}22; color: ${priorityColor}; border: 1px solid ${priorityColor}44; border-radius: 4px; padding: 3px 10px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${task_priority}</span><p style="margin: 12px 0 0; color: #94a3b8; font-size: 13px;">&#128197; Due: ${task_due_date}</p></div><p style="margin: 24px 0 0; font-size: 13px; color: #64748b;">Log in to the admin panel to update its status.</p></div></div>`;
      return fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` }, body: JSON.stringify({ from: 'Layercade Admin <sales@layercade.com>', to: [member.email], subject: `Reminder: ${task_title} is due tomorrow`, html }) });
    });
    const results = await Promise.allSettled(emailPromises);
    const sent = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length;
    const failed = results.length - sent;
    return new Response(JSON.stringify({ sent, failed }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
