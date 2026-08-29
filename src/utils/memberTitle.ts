import type { Member } from '../types';

/**
 * Ensures a name always includes its respectful LDS title/prefix
 * (Brother, Sister, Elder, Bishop, President).
 */
export function formatHonorificName(
  name?: string | null,
  memberOrCalling?: Member | string | null,
  genderFallback?: string | null
): string {
  if (!name || !name.trim()) return '';
  const trimmed = name.trim();

  // If already has an honorific prefix, normalize casing and return
  const prefixMatch = trimmed.match(/^(brother|sister|elder|bishop|president|bro\.|bro|sis\.|sis|eld\.|eld|bp\.|bp|pres\.|pres)\s+/i);
  if (prefixMatch) {
    const rawPrefix = prefixMatch[1].toLowerCase();
    const restOfName = trimmed.substring(prefixMatch[0].length).trim();
    let standardizedPrefix = 'Brother';
    if (rawPrefix.startsWith('sis')) standardizedPrefix = 'Sister';
    else if (rawPrefix.startsWith('eld')) standardizedPrefix = 'Elder';
    else if (rawPrefix.startsWith('bp') || rawPrefix.startsWith('bishop')) standardizedPrefix = 'Bishop';
    else if (rawPrefix.startsWith('pres')) standardizedPrefix = 'President';
    else if (rawPrefix.startsWith('bro')) standardizedPrefix = 'Brother';

    return `${standardizedPrefix} ${restOfName}`;
  }

  // Derive title from member record or calling
  let calling = '';
  let gender = genderFallback || '';

  if (typeof memberOrCalling === 'string') {
    calling = memberOrCalling;
  } else if (memberOrCalling && typeof memberOrCalling === 'object') {
    calling = memberOrCalling.calling || '';
    if (!gender && memberOrCalling.gender) {
      gender = memberOrCalling.gender;
    }
  }

  if (calling) {
    if (/bishop/i.test(calling)) return `Bishop ${trimmed}`;
    if (/stake president|district president|branch president|mission president/i.test(calling)) return `President ${trimmed}`;
    if (/relief society|young women|primary/i.test(calling)) return `Sister ${trimmed}`;
    if (/elders quorum|high priest/i.test(calling)) return `Brother ${trimmed}`;
  }

  if (gender) {
    if (String(gender).toUpperCase().startsWith('F')) return `Sister ${trimmed}`;
    if (String(gender).toUpperCase().startsWith('M')) return `Brother ${trimmed}`;
  }

  // Default to Brother for male/general leaders
  return `Brother ${trimmed}`;
}

/**
 * Formats a member dropdown/datalist label with title and calling
 */
export function getMemberDisplayWithTitle(member: Member): string {
  const titleName = formatHonorificName(member.name, member);
  return member.calling ? `${titleName} (${member.calling})` : titleName;
}
