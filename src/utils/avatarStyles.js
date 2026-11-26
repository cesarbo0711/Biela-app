export const AVATAR_STYLE_DEFAULT = 'adventurer';

export const AVATAR_STYLES = [
  { key: 'adventurer', label: 'Piloto' },
  { key: 'lorelei', label: 'Retrato' },
  { key: 'glass', label: 'Abstracto' },
];

export const AVATAR_STYLES_SELECTABLE = AVATAR_STYLES;

export function buildAvatarUrl(style, seed) {
  return `https://api.dicebear.com/9.x/${style || AVATAR_STYLE_DEFAULT}/svg?seed=${encodeURIComponent(seed || 'biela')}`;
}

export function avatarStyleFromUrl(url) {
  if (typeof url === 'string' && url.includes('/lorelei/')) return 'lorelei';
  if (typeof url === 'string' && url.includes('/glass/')) return 'glass';
  return AVATAR_STYLE_DEFAULT;
}
