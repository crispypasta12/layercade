import { useState, useEffect, useRef } from 'react';
import AdminNavbar from '../../components/admin/AdminNavbar';
import { supabase } from '../../lib/supabase';
import { AnimatePresence } from 'framer-motion';

// ─── Constants ────────────────────────────────────────────────

const COLUMNS = [
  { id: 'backlog',     label: 'Backlog',     color: '#555' },
  { id: 'todo',        label: 'To Do',       color: '#3b82f6' },
  { id: 'in_progress', label: 'In Progress', color: '#ff5500' },
  { id: 'review',      label: 'Review',      color: '#a855f7' },
  { id: 'done',        label: 'Done',        color: '#22c55e' },
];

const PRIORITIES = [
  { id: 'low',      label: 'Low',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { id: 'medium',   label: 'Medium',   color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
  { id: 'high',     label: 'High',     color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { id: 'critical', label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

const DEFAULT_LABELS = ['Frontend', 'Backend', 'Design', 'Marketing', 'Bug', 'Feature', 'Urgent'];

// ─── Helpers ──────────────────────────────────────────────────

function initials(name) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Avatar ───────────────────────────────────────────────────

function Avatar({ member, size = 28 }) {
  if (!member) return null;
  return (
    <div
      title={member.name}
      style={{
        width: size, height: size, borderRadius: 3,
        background: member.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.36, fontWeight: 700, color: '#fff',
        fontFamily: "'Space Mono', monospace", flexShrink: 0,
      }}
    >
      {initials(member.name)}
    </div>
  );
}

// ─── Priority Badge ────────────────────────────────────────────

function PriorityBadge({ priority }) {
  const p = PRIORITIES.find(x => x.id === priority) || PRIORITIES[1];
  return (
    <span style={{
      background: p.bg, color: p.color,
      border: `1px solid ${p.color}35`,
      fontSize: 9, padding: '2px 6px',
      fontFamily: "'Space Mono', monospace",
      textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
    }}>
      {p.label}
    </span>
  );
}

// ─── Due Date Chip ─────────────────────────────────────────────

function DueDateChip({ date }) {
  if (!date) return null;
  const [y, m, d] = date.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isOverdue = due < today;
  const isToday = due.getTime() === today.getTime();
  const color = isOverdue ? '#ef4444' : isToday ? '#f97316' : '#555';
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 3, color, fontSize: 10, fontFamily: "'Space Mono', monospace" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 11 }}>calendar_today</span>
      {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
    </span>
  );
}

// ─── Task Card ────────────────────────────────────────────────

function TaskCard({ task, members, onClick, onDragStart }) {
  const assignees = members.filter(m => (task.assignee_ids || []).includes(m.id));
  const labels = task.labels || [];

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task.id)}
      onClick={() => onClick(task)}
      style={{
        background: '#161616',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '12px',
        cursor: 'grab',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(255,85,0,0.3)';
        e.currentTarget.style.boxShadow = '0 0 16px rgba(255,85,0,0.08)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {labels.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          {labels.map(l => (
            <span key={l} style={{
              fontSize: 9, padding: '2px 6px',
              background: 'rgba(255,85,0,0.08)', color: '#ff5500',
              border: '1px solid rgba(255,85,0,0.18)',
              fontFamily: "'Space Mono', monospace", letterSpacing: '0.05em',
            }}>
              {l}
            </span>
          ))}
        </div>
      )}

      <p style={{ margin: '0 0 8px', color: '#e5e2e1', fontSize: 13, lineHeight: 1.45, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
        {task.title}
      </p>

      {task.description && (
        <p style={{
          margin: '0 0 10px', color: '#555', fontSize: 11, lineHeight: 1.5,
          fontFamily: "'DM Sans', sans-serif",
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {task.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PriorityBadge priority={task.priority} />
          <DueDateChip date={task.due_date} />
        </div>
        <div style={{ display: 'flex' }}>
          {assignees.slice(0, 3).map((m, i) => (
            <div key={m.id} style={{ marginLeft: i > 0 ? -5 : 0, zIndex: 3 - i, position: 'relative' }}>
              <Avatar member={m} size={22} />
            </div>
          ))}
          {assignees.length > 3 && (
            <span style={{ fontSize: 9, color: '#555', marginLeft: 6, fontFamily: "'Space Mono', monospace", alignSelf: 'center' }}>
              +{assignees.length - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Task Column ──────────────────────────────────────────────

function TaskColumn({ column, tasks, members, onCardClick, onDragStart, onDrop, onAddTask }) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      style={{ width: 275, flexShrink: 0, display: 'flex', flexDirection: 'column' }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); onDrop(e, column.id); }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, background: column.color, borderRadius: 2 }} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            {column.label}
          </span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#333', background: '#1a1a1a', padding: '1px 7px', border: '1px solid rgba(255,255,255,0.05)' }}>
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(column.id)}
          style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: 3, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ff5500'}
          onMouseLeave={e => e.currentTarget.style.color = '#333'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
        </button>
      </div>

      {/* Drop indicator */}
      <div style={{
        height: dragOver ? 2 : 1,
        background: dragOver ? column.color : 'rgba(255,255,255,0.05)',
        marginBottom: 12, transition: 'all 0.2s',
        boxShadow: dragOver ? `0 0 8px ${column.color}60` : 'none',
      }} />

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} members={members} onClick={onCardClick} onDragStart={onDragStart} />
        ))}
        {tasks.length === 0 && (
          <div style={{
            border: `1px dashed ${dragOver ? column.color + '40' : 'rgba(255,255,255,0.05)'}`,
            padding: '24px 16px', textAlign: 'center',
            color: dragOver ? column.color + '80' : '#2a2a2a',
            fontSize: 10, fontFamily: "'Space Mono', monospace",
            transition: 'all 0.2s',
          }}>
            {dragOver ? 'Release to drop' : 'No tasks'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Role Manager Modal ────────────────────────────────────────

function RoleManagerModal({ roles, onClose, onSave, onDelete }) {
  const [newRole, setNewRole] = useState('');
  const [editId, setEditId] = useState(null);
  const [editLabel, setEditLabel] = useState('');

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', width: 400, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Manage Roles</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', display: 'flex' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        <div style={{ padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Add */}
          <div>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
              New Role
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newRole.trim()) { onSave(newRole.trim()); setNewRole(''); } }}
                placeholder="e.g. Tech Lead"
                style={{ flex: 1, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, padding: '8px 12px', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
              />
              <button
                onClick={() => { if (newRole.trim()) { onSave(newRole.trim()); setNewRole(''); } }}
                style={{ background: '#ff5500', border: 'none', color: '#fff', padding: '8px 14px', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Existing */}
          <div>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
              Existing Roles ({roles.length})
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {roles.map(role => (
                <div key={role.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {editId === role.id ? (
                    <>
                      <input
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') { onSave(editLabel, role.id); setEditId(null); } if (e.key === 'Escape') setEditId(null); }}
                        style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 12, outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
                      />
                      <button onClick={() => { onSave(editLabel, role.id); setEditId(null); }} style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', display: 'flex' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                      </button>
                      <button onClick={() => setEditId(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', display: 'flex' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, color: '#aaa', fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{role.label}</span>
                      <button onClick={() => { setEditId(role.id); setEditLabel(role.label); }} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', display: 'flex', transition: 'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={e => e.currentTarget.style.color = '#444'}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>edit</span>
                      </button>
                      <button onClick={() => onDelete(role.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', display: 'flex', transition: 'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = '#444'}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                      </button>
                    </>
                  )}
                </div>
              ))}
              {roles.length === 0 && (
                <p style={{ color: '#333', fontSize: 12, fontFamily: "'DM Sans', sans-serif", textAlign: 'center', padding: '16px 0', margin: 0 }}>
                  No roles yet. Add one above.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Member Card (sidebar) ────────────────────────────────────

function MemberCard({ member, allRoles, memberRoles, onRoleToggle }) {
  const [expanded, setExpanded] = useState(false);
  const mRoles = memberRoles
    .filter(mr => mr.member_id === member.id)
    .map(mr => allRoles.find(r => r.id === mr.role_id))
    .filter(Boolean);

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.05)', background: '#111' }}>
      <div
        style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        onClick={() => setExpanded(v => !v)}
      >
        <Avatar member={member} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, color: '#e5e2e1', fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {member.name}
          </p>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
            {mRoles.length > 0
              ? mRoles.map(r => (
                  <span key={r.id} style={{
                    fontSize: 9, padding: '1px 5px',
                    background: `${member.color}18`, color: member.color,
                    border: `1px solid ${member.color}35`,
                    fontFamily: "'Space Mono', monospace",
                  }}>
                    {r.label}
                  </span>
                ))
              : <span style={{ fontSize: 9, color: '#333', fontFamily: "'Space Mono', monospace" }}>No roles</span>
            }
          </div>
        </div>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#333', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
          expand_more
        </span>
      </div>

      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '10px 0 8px' }}>
            Assign Roles
          </p>
          {allRoles.length === 0 ? (
            <span style={{ fontSize: 11, color: '#333', fontFamily: "'DM Sans', sans-serif" }}>No roles available — create some first.</span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allRoles.map(role => {
                const assigned = memberRoles.some(mr => mr.member_id === member.id && mr.role_id === role.id);
                return (
                  <button
                    key={role.id}
                    onClick={() => onRoleToggle(member.id, role.id, assigned)}
                    style={{
                      background: assigned ? `${member.color}20` : '#0a0a0a',
                      border: `1px solid ${assigned ? member.color + '55' : 'rgba(255,255,255,0.08)'}`,
                      color: assigned ? member.color : '#555',
                      fontSize: 10, padding: '4px 8px', cursor: 'pointer',
                      fontFamily: "'Space Mono', monospace", transition: 'all 0.15s',
                    }}
                  >
                    {assigned && '✓ '}{role.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Team Sidebar ──────────────────────────────────────────────

function TeamSidebar({ members, roles, memberRoles, onRoleToggle, onOpenRoleManager }) {
  return (
    <div style={{
      width: 252, flexShrink: 0,
      borderLeft: '1px solid rgba(255,255,255,0.05)',
      background: '#0c0c0c',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
          Team · {members.length}
        </span>
        <button
          onClick={onOpenRoleManager}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid rgba(255,255,255,0.07)', color: '#444', cursor: 'pointer', padding: '4px 8px', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,85,0,0.35)'; e.currentTarget.style.color = '#ff5500'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#444'; }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>manage_accounts</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Roles</span>
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {members.map(m => (
          <MemberCard key={m.id} member={m} allRoles={roles} memberRoles={memberRoles} onRoleToggle={onRoleToggle} />
        ))}
      </div>
    </div>
  );
}

// ─── Task Modal ────────────────────────────────────────────────

function TaskModal({ task, members, onClose, onSave, onDelete }) {
  const isNew = !task?.id;
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assignee_ids: task?.assignee_ids || [],
    labels: task?.labels || [],
    due_date: task?.due_date || '',
  });
  const [labelInput, setLabelInput] = useState('');
  const [errors, setErrors] = useState({});

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: null }));
  };

  const toggleAssignee = id =>
    set('assignee_ids', form.assignee_ids.includes(id)
      ? form.assignee_ids.filter(x => x !== id)
      : [...form.assignee_ids, id]);

  const toggleLabel = label =>
    set('labels', form.labels.includes(label)
      ? form.labels.filter(x => x !== label)
      : [...form.labels, label]);

  const addCustomLabel = () => {
    const l = labelInput.trim();
    if (l && !form.labels.includes(l)) set('labels', [...form.labels, l]);
    setLabelInput('');
  };

  const input = {
    width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff', fontSize: 13, padding: '8px 12px',
    outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box',
  };
  const fieldLabel = {
    fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#555',
    textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 7,
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 580, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            {isNew ? 'New Task' : 'Edit Task'}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!isNew && (
              <button
                onClick={() => onDelete(task.id)}
                style={{ background: 'none', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', padding: '5px 12px', fontFamily: "'Space Mono', monospace", fontSize: 9, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>delete</span>
                Delete
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', display: 'flex' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Title */}
          <div>
            <label style={{ ...fieldLabel, color: errors.title ? '#ef4444' : '#555' }}>Title *</label>
            <input
              autoFocus
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="What needs to be done?"
              style={{ ...input, borderColor: errors.title ? '#ef4444' : 'rgba(255,255,255,0.1)', boxShadow: errors.title ? '0 0 0 1px #ef444440' : 'none' }}
            />
            {errors.title && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, color: '#ef4444', fontSize: 10, fontFamily: "'Space Mono', monospace" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>
                {errors.title}
              </span>
            )}
          </div>

          {/* Description */}
          <div>
            <label style={fieldLabel}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Add more detail…" rows={3} style={{ ...input, resize: 'vertical' }} />
          </div>

          {/* Status / Priority / Due Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={fieldLabel}>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={fieldLabel}>Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...fieldLabel, color: errors.due_date ? '#ef4444' : '#555' }}>Due Date *</label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => set('due_date', e.target.value)}
                style={{ ...input, borderColor: errors.due_date ? '#ef4444' : 'rgba(255,255,255,0.1)', boxShadow: errors.due_date ? '0 0 0 1px #ef444440' : 'none' }}
              />
              {errors.due_date && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, color: '#ef4444', fontSize: 10, fontFamily: "'Space Mono', monospace" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>
                  {errors.due_date}
                </span>
              )}
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label style={fieldLabel}>Assignees</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {members.map(m => {
                const on = form.assignee_ids.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleAssignee(m.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px',
                      background: on ? `${m.color}18` : '#0a0a0a',
                      border: `1px solid ${on ? m.color + '60' : 'rgba(255,255,255,0.08)'}`,
                      color: on ? m.color : '#555', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <Avatar member={m} size={20} />
                    <span style={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{m.name.split(' ')[0]}</span>
                    {on && <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Labels */}
          <div>
            <label style={fieldLabel}>Labels</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {DEFAULT_LABELS.map(l => {
                const on = form.labels.includes(l);
                return (
                  <button
                    key={l}
                    onClick={() => toggleLabel(l)}
                    style={{
                      padding: '4px 10px', fontSize: 10,
                      background: on ? 'rgba(255,85,0,0.12)' : '#0a0a0a',
                      border: `1px solid ${on ? 'rgba(255,85,0,0.4)' : 'rgba(255,255,255,0.07)'}`,
                      color: on ? '#ff5500' : '#555',
                      cursor: 'pointer', fontFamily: "'Space Mono', monospace", transition: 'all 0.15s',
                    }}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomLabel()}
                placeholder="Custom label…"
                style={{ ...input, flex: 1 }}
              />
              <button onClick={addCustomLabel} style={{ padding: '8px 13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#555', cursor: 'pointer', display: 'flex' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              </button>
            </div>
            {form.labels.filter(l => !DEFAULT_LABELS.includes(l)).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {form.labels.filter(l => !DEFAULT_LABELS.includes(l)).map(l => (
                  <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'rgba(255,85,0,0.1)', border: '1px solid rgba(255,85,0,0.25)', color: '#ff5500', fontSize: 10, fontFamily: "'Space Mono', monospace" }}>
                    {l}
                    <button onClick={() => toggleLabel(l)} style={{ background: 'none', border: 'none', color: '#ff5500', cursor: 'pointer', padding: 0, display: 'flex', lineHeight: 1 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#555', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Cancel
          </button>
          <button
            onClick={() => {
              const newErrors = {};
              if (!form.title.trim()) newErrors.title = 'Title is required';
              if (!form.due_date)     newErrors.due_date = 'Due date is required';
              if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
              onSave({ ...task, ...form });
            }}
            style={{
              padding: '8px 22px', background: '#ff5500', border: 'none', color: '#fff',
              cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.06em', transition: 'transform 0.1s, box-shadow 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255,85,0,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            {isNew ? 'Create Task' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────

export default function Tasks() {
  const [tasks,       setTasks]       = useState([]);
  const [members,     setMembers]     = useState([]);
  const [roles,       setRoles]       = useState([]);
  const [memberRoles, setMemberRoles] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modalTask,   setModalTask]   = useState(null);
  const [showRoles,   setShowRoles]   = useState(false);
  const [filterMember,   setFilterMember]   = useState(null);
  const [filterPriority, setFilterPriority] = useState('');
  const [search,         setSearch]         = useState('');

  const dragId = useRef(null);

  // ── Load ──
  useEffect(() => {
    Promise.all([
      supabase.from('tasks').select('*').order('position'),
      supabase.from('team_members').select('*').order('created_at'),
      supabase.from('task_roles').select('*').order('label'),
      supabase.from('member_roles').select('*'),
    ]).then(([t, m, r, mr]) => {
      setTasks(t.data || []);
      setMembers(m.data || []);
      setRoles(r.data || []);
      setMemberRoles(mr.data || []);
      setLoading(false);
    });
  }, []);

  // ── Task CRUD ──
  const handleSaveTask = async taskData => {
    if (taskData.id) {
      const { data } = await supabase.from('tasks').update({
        title: taskData.title, description: taskData.description,
        status: taskData.status, priority: taskData.priority,
        assignee_ids: taskData.assignee_ids, labels: taskData.labels,
        due_date: taskData.due_date || null,
        updated_at: new Date().toISOString(),
      }).eq('id', taskData.id).select().single();
      setTasks(ts => ts.map(t => t.id === data.id ? data : t));
    } else {
      const maxPos = tasks.filter(t => t.status === taskData.status)
        .reduce((m, t) => Math.max(m, t.position || 0), 0);
      const { data } = await supabase.from('tasks').insert({
        ...taskData, position: maxPos + 1,
      }).select().single();
      setTasks(ts => [...ts, data]);
    }
    setModalTask(null);
  };

  const handleDeleteTask = async id => {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(ts => ts.filter(t => t.id !== id));
    setModalTask(null);
  };

  // ── Drag & Drop ──
  const handleDragStart = (e, id) => {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, newStatus) => {
    const id = dragId.current;
    dragId.current = null;
    if (!id) return;
    const task = tasks.find(t => t.id === id);
    if (!task || task.status === newStatus) return;
    setTasks(ts => ts.map(t => t.id === id ? { ...t, status: newStatus } : t));
    await supabase.from('tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
  };

  // ── Role CRUD ──
  const handleSaveRole = async (label, id) => {
    if (id) {
      const { data } = await supabase.from('task_roles').update({ label }).eq('id', id).select().single();
      setRoles(rs => rs.map(r => r.id === id ? data : r));
    } else {
      const { data } = await supabase.from('task_roles').insert({ label }).select().single();
      setRoles(rs => [...rs, data]);
    }
  };

  const handleDeleteRole = async id => {
    await supabase.from('task_roles').delete().eq('id', id);
    setRoles(rs => rs.filter(r => r.id !== id));
    setMemberRoles(mrs => mrs.filter(mr => mr.role_id !== id));
  };

  const handleRoleToggle = async (memberId, roleId, assigned) => {
    if (assigned) {
      await supabase.from('member_roles').delete().eq('member_id', memberId).eq('role_id', roleId);
      setMemberRoles(mrs => mrs.filter(mr => !(mr.member_id === memberId && mr.role_id === roleId)));
    } else {
      const { data } = await supabase.from('member_roles').insert({ member_id: memberId, role_id: roleId }).select().single();
      setMemberRoles(mrs => [...mrs, data]);
    }
  };

  // ── Filtered tasks ──
  const filtered = tasks.filter(t => {
    if (filterMember && !(t.assignee_ids || []).includes(filterMember)) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const byCol = Object.fromEntries(COLUMNS.map(c => [c.id, filtered.filter(t => t.status === c.id)]));

  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const overdue = tasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false;
    const [y, m, d] = t.due_date.split('-').map(Number);
    return new Date(y, m - 1, d) < new Date(new Date().setHours(0, 0, 0, 0));
  }).length;

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', flexDirection: 'column' }}>
      <AdminNavbar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: 'calc(100vh - 65px)' }}>

        {/* Page Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <div style={{ marginRight: 8 }}>
            <h1 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.06em', lineHeight: 1 }}>Tasks</h1>
            <p style={{ margin: '3px 0 0', fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#444' }}>
              {tasks.length} total · {inProgress} in progress{overdue > 0 ? ` · ` : ''}
              {overdue > 0 && <span style={{ color: '#ef4444' }}>{overdue} overdue</span>}
            </p>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#333', pointerEvents: 'none' }}>search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks…"
              style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', color: '#e5e2e1', fontSize: 12, padding: '7px 12px 7px 30px', outline: 'none', fontFamily: "'DM Sans', sans-serif", width: 190 }}
            />
          </div>

          {/* Member filter */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {members.map(m => (
              <button
                key={m.id}
                onClick={() => setFilterMember(filterMember === m.id ? null : m.id)}
                title={m.name}
                style={{
                  padding: 2, border: `2px solid ${filterMember === m.id ? m.color : 'transparent'}`,
                  borderRadius: 4, background: 'none', cursor: 'pointer',
                  opacity: filterMember && filterMember !== m.id ? 0.25 : 1,
                  transition: 'all 0.15s',
                }}
              >
                <Avatar member={m} size={26} />
              </button>
            ))}
          </div>

          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', color: '#555', fontSize: 10, padding: '7px 10px', outline: 'none', fontFamily: "'Space Mono', monospace", cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            <option value="">All priorities</option>
            {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>

          {/* Clear filters */}
          {(filterMember || filterPriority || search) && (
            <button
              onClick={() => { setFilterMember(null); setFilterPriority(''); setSearch(''); }}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.07)', color: '#555', cursor: 'pointer', padding: '6px 10px', fontFamily: "'Space Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>filter_alt_off</span>
              Clear
            </button>
          )}

          <div style={{ flex: 1 }} />

          {/* New Task */}
          <button
            onClick={() => setModalTask({})}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: '#ff5500', border: 'none', color: '#fff',
              padding: '8px 16px', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'transform 0.1s, box-shadow 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(255,85,0,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>
            New Task
          </button>
        </div>

        {/* Board + Sidebar */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Kanban */}
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', padding: '20px 24px' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: '#333', fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
                Loading…
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', minWidth: 'max-content' }}>
                {COLUMNS.map(col => (
                  <TaskColumn
                    key={col.id}
                    column={col}
                    tasks={byCol[col.id] || []}
                    members={members}
                    onCardClick={setModalTask}
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                    onAddTask={status => setModalTask({ status })}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <TeamSidebar
            members={members}
            roles={roles}
            memberRoles={memberRoles}
            onRoleToggle={handleRoleToggle}
            onOpenRoleManager={() => setShowRoles(true)}
          />
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modalTask !== null && (
          <TaskModal
            key="task"
            task={modalTask}
            members={members}
            onClose={() => setModalTask(null)}
            onSave={handleSaveTask}
            onDelete={handleDeleteTask}
          />
        )}
        {showRoles && (
          <RoleManagerModal
            key="roles"
            roles={roles}
            onClose={() => setShowRoles(false)}
            onSave={handleSaveRole}
            onDelete={handleDeleteRole}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
