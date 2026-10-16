import { createAvatar } from '@dicebear/core';
import { bottts, pixelArt, funEmoji, thumbs } from '@dicebear/collection';

// A member's avatar is stored as "style:seed" in members.avatar. Rendering is
// done locally by DiceBear, so a seed is all we keep and nothing is fetched.
// The member's own colour stays the background, so people remain recognisable
// by colour in dense lists (stacked task assignees, expense splits).

export const AVATAR_STYLES = [
  { id: 'bottts',   label: 'Bots',   style: bottts },
  { id: 'pixelArt', label: 'Pixel',  style: pixelArt },
  { id: 'funEmoji', label: 'Blobs',  style: funEmoji },
  { id: 'thumbs',   label: 'Thumbs', style: thumbs },
];

export const AVATAR_SEEDS = [
  'Ember', 'Nozzle', 'Voxel', 'Glitch', 'Bowser', 'Pixel',
  'Turbo', 'Sprocket', 'Nebula', 'Chonk', 'Filament', 'Neon',
];

const cache = new Map();

export function avatarUri(value, color) {
  if (!value) return null;
  const [styleId, ...rest] = value.split(':');
  const seed = rest.join(':');
  const entry = AVATAR_STYLES.find((s) => s.id === styleId);
  if (!entry || !seed) return null;

  const key = `${value}|${color || ''}`;
  if (!cache.has(key)) {
    const bg = (color || '#555555').replace('#', '');
    cache.set(key, createAvatar(entry.style, { seed, backgroundColor: [bg] }).toDataUri());
  }
  return cache.get(key);
}

export function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}
