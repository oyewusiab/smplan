/**
 * Utility for formatting Latter-day Saint church titles and respectful prefixes.
 */

export function getRoleDisplayTitle(role?: string, calling?: string): string {
  if (!role) return 'Member';
  const r = role.toUpperCase();
  if (r === 'ADMIN') return 'Bishop';
  if (r === 'BISHOPRIC') return calling || 'Bishopric';
  if (r === 'CLERK') return 'Ward Clerk';
  if (r === 'SECRETARY') return 'Executive Secretary';
  if (r === 'MUSIC') return 'Music Leader';
  return calling || role;
}

export function formatMemberTitle(
  name?: string,
  gender?: 'M' | 'F' | string,
  calling?: string,
  role?: string
): string {
  if (!name || !name.trim()) return '';
  const trimmed = name.trim();

  // Already prefixed
  if (
    /^(Bishop|President|Elder|Brother|Bro\.|Sister|Sis\.|Patriarch)\s+/i.test(trimmed)
  ) {
    return trimmed;
  }

  // Role or calling is Bishop/Bishopric
  if (role === 'ADMIN' || (calling && /bishop/i.test(calling))) {
    return 'Bishop ' + trimmed;
  }
  if (calling && /president/i.test(calling)) {
    return 'President ' + trimmed;
  }

  // Gender based
  const g = (gender || '').toUpperCase();
  if (g === 'F' || g === 'FEMALE') {
    return 'Sister ' + trimmed;
  }
  if (g === 'M' || g === 'MALE') {
    return 'Brother ' + trimmed;
  }

  // Default
  return 'Brother ' + trimmed;
}
