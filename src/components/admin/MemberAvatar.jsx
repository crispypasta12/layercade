import { avatarUri, initials } from '../../lib/avatars';

export default function MemberAvatar({ member, size = 28, title, glow = false, className = '' }) {
  if (!member) return null;
  const color = member.color || '#555';
  const uri = avatarUri(member.avatar, color);

  const style = {
    width: size, height: size, borderRadius: 3, flexShrink: 0,
    background: color,
    boxShadow: glow ? `0 0 32px ${color}55` : undefined,
  };

  if (uri) {
    return (
      <img
        src={uri}
        alt={member.name}
        title={title ?? member.name}
        className={className}
        style={{ ...style, display: 'block', objectFit: 'cover' }}
        draggable={false}
      />
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
