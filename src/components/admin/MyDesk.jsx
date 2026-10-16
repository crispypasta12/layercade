import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useCurrentMember } from '../../contexts/CurrentMemberContext';
import { calculateBalances, simplifyDebts } from '../../lib/expenseBalances';
import MemberAvatar from './MemberAvatar';

/**
 * "Your desk": the Dashboard's answer to "what do I do next?" — the signed-in
 * member's open tasks, ideas still waiting for their vote, and where they
 * stand on shared expenses. Everything else on the Dashboard is about the
 * shop; this is about the person looking at it.
 */

const MAX_TASKS = 5;
const MAX_IDEAS = 3;
const VOTABLE_STATUSES = ['inbox', 'shortlisted'];

const PRIORITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };

const taka = (n) => `৳${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysFromToday(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((due - now) / 86_400_000);
}

function dueLabel(days) {
  if (days == null) return null;
  if (days < 0)   return { text: `${-days}d late`, color: '#ef4444' };
  if (days === 0) return { text: 'Today',          color: '#f97316' };
  if (days === 1) return { text: 'Tomorrow',       color: '#eab308' };
  if (days <= 7)  return { text: `In ${days}d`,    color: '#a8a29e' };
  return { text: `In ${days}d`, color: '#57534e' };
}

// Late first, then soonest due, then in-progress work without a date.
function taskOrder(a, b) {
  const da = daysFromToday(a.due_date);
  const db = daysFromToday(b.due_date);
  if (da != null && db != null) return da - db;
  if (da != null) return -1;
  if (db != null) return 1;
  return (b.status === 'in_progress') - (a.status === 'in_progress');
}

/* ─── Card shell ──────────────────────────────────────────────────── */

function DeskCard({ icon, title, count, to, linkLabel, children }) {
  return (
    <div className="bg-[#111111] border border-white/10 flex flex-col min-h-[220px]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <span className="material-symbols-outlined text-[#ff5500]" style={{ fontSize: 16 }}>{icon}</span>
        <span className="font-technical text-[10px] uppercase tracking-widest text-stone-300 flex-1">{title}</span>
        {count > 0 && (
          <span className="font-technical text-[9px] leading-none px-1.5 py-1 bg-[#ff5500]/20 text-[#ff5500]">
            {count}
          </span>
        )}
      </div>
      <div className="flex-1">{children}</div>
      <Link
        to={to}
        className="px-4 py-3 border-t border-white/5 font-technical text-[10px] uppercase tracking-widest
                   text-stone-500 hover:text-[#ff5500] transition-colors flex items-center gap-1"
      >
        {linkLabel}
        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>arrow_forward</span>
      </Link>
    </div>
  );
}

function Empty({ icon, children }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <span className="material-symbols-outlined text-stone-700" style={{ fontSize: 22 }}>{icon}</span>
      <p className="font-technical text-[10px] uppercase tracking-widest text-stone-600">{children}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="p-4 space-y-3">
      {[1, 2, 3].map((i) => <div key={i} className="h-4 bg-white/5 animate-pulse rounded" />)}
    </div>
  );
}

/* ─── Desk ────────────────────────────────────────────────────────── */

export default function MyDesk() {
  const { member: me } = useCurrentMember();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!me) return;
    let alive = true;
    Promise.all([
      supabase.from('tasks')
        .select('id, title, status, priority, due_date')
        .neq('status', 'done')
        // assignee_ids is jsonb: a JSON string makes PostgREST send cs.["id"]
        // rather than a Postgres array literal, which jsonb rejects.
        .contains('assignee_ids', JSON.stringify([me.id])),
      supabase.from('ideas')
        .select('id, title, status, image_url, added_by, created_at')
        .in('status', VOTABLE_STATUSES)
        .order('created_at', { ascending: false }),
      supabase.from('idea_votes').select('idea_id').eq('member_id', me.id),
      supabase.from('members').select('id, name, color, avatar'),
      supabase.from('expenses').select('id, amount, paid_by'),
      supabase.from('expense_splits').select('expense_id, member_id, amount'),
      supabase.from('settlements').select('from_member, to_member, amount'),
    ]).then(([tasks, ideas, votes, members, expenses, splits, settlements]) => {
      if (!alive) return;
      const voted = new Set((votes.data ?? []).map((v) => v.idea_id));
      const balances = calculateBalances(members.data ?? [], expenses.data ?? [], splits.data ?? [], settlements.data ?? []);
      setData({
        tasks: (tasks.data ?? []).sort(taskOrder),
        // Your own ideas don't wait on your vote.
        ideas: (ideas.data ?? []).filter((i) => !voted.has(i.id) && i.added_by !== me.id),
        members: members.data ?? [],
        balance: balances[me.id] ?? 0,
        debts: simplifyDebts({ ...balances }).filter((t) => t.from === me.id || t.to === me.id),
      });
    });
    return () => { alive = false; };
  }, [me]);

  if (!me) return null;
  const loading = !data;
  const today = todayIso();
  const lateCount = data ? data.tasks.filter((t) => t.due_date && t.due_date < today).length : 0;
  const memberById = (id) => data?.members.find((m) => m.id === id);
  const firstName = me.name.split(' ')[0];

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <MemberAvatar member={me} size={22} />
        <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest">
          Your desk, {firstName}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── My tasks ─────────────────────────────────────────── */}
        <DeskCard
          icon="task_alt"
          title="My tasks"
          count={data?.tasks.length ?? 0}
          to="/admin/tasks?mine=1"
          linkLabel="All my tasks"
        >
          {loading ? <Skeleton /> : data.tasks.length === 0 ? (
            <Empty icon="beach_access">Nothing on your plate</Empty>
          ) : (
            <>
              {lateCount > 0 && (
                <p className="px-4 pt-3 font-technical text-[10px] uppercase tracking-widest text-red-400">
                  {lateCount} overdue
                </p>
              )}
              <ul className="py-1">
                {data.tasks.slice(0, MAX_TASKS).map((t) => {
                  const due = dueLabel(daysFromToday(t.due_date));
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-2">
                      <span
                        className="w-1.5 h-1.5 flex-shrink-0"
                        style={{ background: PRIORITY_COLORS[t.priority] ?? '#555' }}
                        title={`${t.priority} priority`}
                      />
                      <span className="font-body text-sm text-stone-200 truncate flex-1">{t.title}</span>
                      {t.status === 'in_progress' && (
                        <span className="font-technical text-[9px] uppercase tracking-widest text-[#ff5500] flex-shrink-0">Doing</span>
                      )}
                      {due && (
                        <span className="font-technical text-[10px] flex-shrink-0" style={{ color: due.color }}>{due.text}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {data.tasks.length > MAX_TASKS && (
                <p className="px-4 pb-3 font-technical text-[10px] text-stone-600">+{data.tasks.length - MAX_TASKS} more</p>
              )}
            </>
          )}
        </DeskCard>

        {/* ── Ideas waiting for my vote ────────────────────────── */}
        <DeskCard
          icon="how_to_vote"
          title="Waiting for your vote"
          count={data?.ideas.length ?? 0}
          to="/admin/ideas"
          linkLabel="Open Ideas board"
        >
          {loading ? <Skeleton /> : data.ideas.length === 0 ? (
            <Empty icon="thumb_up">You've voted on everything</Empty>
          ) : (
            <ul className="py-1">
              {data.ideas.slice(0, MAX_IDEAS).map((i) => {
                const by = memberById(i.added_by);
                return (
                  <li key={i.id} className="flex items-center gap-3 px-4 py-2">
                    <div className="w-9 h-9 flex-shrink-0 bg-stone-900 border border-white/10 overflow-hidden">
                      {i.image_url ? (
                        <img src={i.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-stone-700" style={{ fontSize: 14 }}>lightbulb</span>
                        </div>
                      )}
                    </div>
                    <span className="font-body text-sm text-stone-200 truncate flex-1">{i.title}</span>
                    {by && <MemberAvatar member={by} size={18} title={`Added by ${by.name}`} />}
                  </li>
                );
              })}
              {data.ideas.length > MAX_IDEAS && (
                <li className="px-4 pt-1 pb-2 font-technical text-[10px] text-stone-600">+{data.ideas.length - MAX_IDEAS} more</li>
              )}
            </ul>
          )}
        </DeskCard>

        {/* ── My balance ───────────────────────────────────────── */}
        <DeskCard
          icon="account_balance_wallet"
          title="Your balance"
          count={0}
          to="/admin/expenses?tab=balances"
          linkLabel="Settle up"
        >
          {loading ? <Skeleton /> : (() => {
            const owed = data.balance > 0.01;
            const owing = data.balance < -0.01;
            const color = owed ? '#10b981' : owing ? '#ef4444' : '#78716c';
            return (
              <div className="px-4 py-4">
                <p className="font-technical text-[10px] uppercase tracking-widest" style={{ color }}>
                  {owed ? 'You are owed' : owing ? 'You owe' : 'All settled up'}
                </p>
                <p className="mt-1 font-bold" style={{ fontFamily: "'Space Mono', monospace", fontSize: '1.6rem', color: owed || owing ? color : '#e7e5e4' }}>
                  {taka(data.balance)}
                </p>
                {data.debts.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {data.debts.map((t) => {
                      const iPay = t.from === me.id;
                      const other = memberById(iPay ? t.to : t.from);
                      if (!other) return null;
                      return (
                        <li key={`${t.from}-${t.to}`} className="flex items-center gap-2">
                          <MemberAvatar member={other} size={20} />
                          <span className="font-body text-sm text-stone-300 flex-1 truncate">
                            {iPay ? `Pay ${other.name.split(' ')[0]}` : `${other.name.split(' ')[0]} owes you`}
                          </span>
                          <span className="font-technical text-[11px]" style={{ color: iPay ? '#ef4444' : '#10b981' }}>
                            {taka(t.amount)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })()}
        </DeskCard>
      </div>
    </div>
  );
}
