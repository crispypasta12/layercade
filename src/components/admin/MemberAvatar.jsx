import { avatarUri, initials } from '../../lib/avatars';

// `tagged` pins the member's initials to the bottom-right corner. Cards use it
// because a cartoon face alone does not say who someone is at 20px. The tag
// sits on the right so it stays visible in left-overlapping stacks, where each
// avatar is drawn above the next one.
export default function MemberAvatar({ member, size = 28, title, glow = false, tagged = false, className = '' }) {
  if (!member) return null;
  const color = member.color || '#555';
  const uri = avatarUri(member.avatar, color);

  const style = {
    width: size, height: size, borderRadius: 3, flexShrink: 0,
    background: color,
    boxShadow: glow ? `0 0 32px ${color}55` : undefined,
  };

  if (uri) {
    const img = (
      <img
        src={uri}
        alt={member.name}
        title={title ?? member.name}
        className={tagged ? undefined : className}
        style={{ ...style, display: 'block', objectFit: 'cover' }}
        draggable={false}
      />
    );
    if (!tagged) return img;

    const tagFont = Math.max(7, Math.round(size * 0.3));
    return (
      <div className={className} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        {img}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', right: -Math.round(size * 0.18), bottom: -Math.round(size * 0.14),
            padding: '1px 2px', lineHeight: 1, borderRadius: 2,
            background: '#0d0d0d', border: `1px solid ${color}`,
            fontFamily: "'Space Mono', monospace", fontSize: tagFont, fontWeight: 700,
            color: '#fff', letterSpacing: '0.02em', pointerEvents: 'none',
          }}
        >
          {initials(member.name)}
        </span>
      </div>
    );
  }

  return (
    <div
      title={title ?? member.name}
      className={className}
      style={{
        ...style,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.max(8, Math.round(size * 0.38)), fontWeight: 700, color: '#fff',
        fontFamily: "'Space Mono', monospace",
      }}
    >
      {initials(member.name)}
    </div>
  );
}
