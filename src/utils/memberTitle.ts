import type { Member, User } from '../types';

let _MEMBERS_CACHE: Member[] = [];

/**
 * Registers the active ward members directory in-memory for automatic title and calling resolution.
 */
export function setMembersDirectoryRegistry(members: Member[]): void {
  if (Array.isArray(members)) {
    _MEMBERS_CACHE = members;
  }
}

export function getMembersDirectoryRegistry(): Member[] {
  return _MEMBERS_CACHE;
}

/**
 * Normalizes "Last, First Middle" into "First Middle Last"
 */
export function normalizeNameOrder(name: string): string {
  if (!name || !name.includes(',')) return name;
  const parts = name.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 2) {
    return `${parts[1]} ${parts[0]}`;
  }
  return name.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Strips all prefixes (Brother, Sister, Elder, Bishop, President, Patriarch, Bro, Sis, Pres, Bp, Eld)
 * from anywhere in the string and cleans duplicate/embedded titles (e.g. "Brother Olabode Johnson Brother Gbajobi" -> baseName: "Olabode Johnson Gbajobi", detectedTitle: "Brother")
 */
export function stripAllHonorifics(rawName?: string | null): { baseName: string; detectedTitle?: string } {
  if (!rawName || !rawName.trim()) return { baseName: '' };
  let str = rawName.trim();

  // 1. Identify all honorific tokens anywhere in the string
  const titleTokensRegex = /\b(brother|sister|elder|bishop|president|patriarch|bro\.|bro|sis\.|sis|eld\.|eld|bp\.|bp|pres\.|pres)\b/gi;
  let highestTitle: string | undefined = undefined;

  let match: RegExpExecArray | null;
  while ((match = titleTokensRegex.exec(str)) !== null) {
    const rawP = match[1].toLowerCase();
    if (rawP.startsWith('bp') || rawP.startsWith('bishop')) {
      highestTitle = 'Bishop';
    } else if (rawP.startsWith('pres') && highestTitle !== 'Bishop') {
      highestTitle = 'President';
    } else if (rawP.startsWith('patr') && !['Bishop', 'President'].includes(highestTitle || '')) {
      highestTitle = 'Patriarch';
    } else if (rawP.startsWith('eld') && !['Bishop', 'President', 'Patriarch'].includes(highestTitle || '')) {
      highestTitle = 'Elder';
    } else if (rawP.startsWith('sis') && !['Bishop', 'President', 'Patriarch'].includes(highestTitle || '')) {
      highestTitle = 'Sister';
    } else if (rawP.startsWith('bro') && !highestTitle) {
      highestTitle = 'Brother';
    }
  }

  // 2. Remove all honorific words from the string
  str = str.replace(/\b(brother|sister|elder|bishop|president|patriarch|bro\.|bro|sis\.|sis|eld\.|eld|bp\.|bp|pres\.|pres)\b/gi, ' ').trim();

  // 3. Normalize "Last, First Middle" to "First Middle Last"
  if (str.includes(',')) {
    const parts = str.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 2) {
      str = `${parts[1]} ${parts[0]}`;
    } else {
      str = str.replace(/,/g, ' ');
    }
  }

  // 4. Clean extra spaces and punctuation
  const cleanBase = str.replace(/,/g, '').replace(/\s{2,}/g, ' ').trim();

  return { baseName: cleanBase, detectedTitle: highestTitle };
}

/**
 * Ensures a name always includes its single respectful LDS title/prefix
 * (Bishop, President, Patriarch, Elder, Sister, Brother).
 * 
 * Rules:
 * 1. Calling-based titles ALWAYS supersede gender-based titles.
 * 2. If a member is the Bishop, their title is ALWAYS "Bishop" (never "Brother Bishop", never "Brother").
 * 3. Gender determines Brother vs Sister automatically without requiring manual editing.
 * 4. Resolves against 6-digit member_id and members directory registry when available.
 */
export function formatHonorificName(
  name?: string | null,
  memberOrCallingOrOptions?: Member | User | string | {
    calling?: string;
    gender?: string;
    role?: string;
    priesthood_office?: string;
    members_id?: string;
    member_id?: string;
  } | null,
  genderFallback?: string | null
): string {
  if (!name || !name.trim()) return '';

  const rawInput = name.trim();
  const { baseName, detectedTitle } = stripAllHonorifics(rawInput);
  if (!baseName) return '';

  let calling = '';
  let gender = genderFallback || '';
  let role = '';
  let priesthoodOffice = '';
  let memberId = '';

  if (typeof memberOrCallingOrOptions === 'string') {
    calling = memberOrCallingOrOptions;
  } else if (memberOrCallingOrOptions && typeof memberOrCallingOrOptions === 'object') {
    calling = ('calling' in memberOrCallingOrOptions && memberOrCallingOrOptions.calling) ? String(memberOrCallingOrOptions.calling) : '';
    if (!gender && 'gender' in memberOrCallingOrOptions && memberOrCallingOrOptions.gender) {
      gender = String(memberOrCallingOrOptions.gender);
    }
    if ('role' in memberOrCallingOrOptions && memberOrCallingOrOptions.role) {
      role = String(memberOrCallingOrOptions.role);
    }
    if ('priesthood_office' in memberOrCallingOrOptions && memberOrCallingOrOptions.priesthood_office) {
      priesthoodOffice = String(memberOrCallingOrOptions.priesthood_office);
    }
    if ('member_id' in memberOrCallingOrOptions && memberOrCallingOrOptions.member_id) {
      memberId = String(memberOrCallingOrOptions.member_id);
    } else if ('members_id' in memberOrCallingOrOptions && memberOrCallingOrOptions.members_id) {
      memberId = String(memberOrCallingOrOptions.members_id);
    }
  }

  // If calling or gender wasn't passed directly, look up the member in the registry
  if ((!calling || !gender) && _MEMBERS_CACHE.length > 0) {
    let matchedMem: Member | undefined;
    if (memberId) {
      matchedMem = _MEMBERS_CACHE.find((m) => (m.member_id === memberId || m.members_id === memberId));
    }
    if (!matchedMem) {
      matchedMem = findMemberInList(baseName, _MEMBERS_CACHE);
    }
    if (matchedMem) {
      if (!calling && matchedMem.calling) calling = matchedMem.calling;
      if (!gender && matchedMem.gender) gender = matchedMem.gender;
      if (!priesthoodOffice && matchedMem.priesthood_office) priesthoodOffice = matchedMem.priesthood_office;
    }
  }

  // 1. Calling / Role Priority 1: Bishop (always Bishop, never Brother or Brother Bishop)
  if (
    detectedTitle === 'Bishop' ||
    /bishop/i.test(calling) ||
    /bishop/i.test(priesthoodOffice) ||
    (role === 'BISHOPRIC' && /bishop/i.test(calling)) ||
    baseName.toLowerCase() === 'bishop'
  ) {
    if (baseName.toLowerCase() === 'bishop') {
      // Find the ward bishop's actual name if available
      const bishopMember = _MEMBERS_CACHE.find((m) => m.calling && /bishop/i.test(m.calling));
      if (bishopMember) {
        const { baseName: bName } = stripAllHonorifics(bishopMember.name);
        return `Bishop ${bName}`;
      }
      return 'Bishop';
    }
    return `Bishop ${baseName}`;
  }

  // 2. Calling / Role Priority 2: President (Stake/District/Branch/Mission/Temple/Area Presidency)
  if (
    detectedTitle === 'President' ||
    /stake president|district president|branch president|mission president|temple president|area president/i.test(calling) ||
    /stake presidency|district presidency|branch presidency/i.test(calling)
  ) {
    return `President ${baseName}`;
  }

  // 3. Priesthood Office: Patriarch
  if (
    detectedTitle === 'Patriarch' ||
    /patriarch/i.test(calling) ||
    /patriarch/i.test(priesthoodOffice)
  ) {
    return `Patriarch ${baseName}`;
  }

  // 4. Calling / Office: Elder (Full-Time Missionary or Elder)
  if (
    detectedTitle === 'Elder' ||
    /full[- ]time missionary|missionary/i.test(calling)
  ) {
    return `Elder ${baseName}`;
  }

  // 5. Gender / Auxiliary Priority: Sister
  const gUpper = String(gender).toUpperCase();
  if (
    detectedTitle === 'Sister' ||
    gUpper === 'F' ||
    gUpper === 'FEMALE' ||
    /relief society|young women|primary/i.test(calling)
  ) {
    return `Sister ${baseName}`;
  }

  // 6. Default to Brother for male/general leaders
  return `Brother ${baseName}`;
}

/**
 * Formats a member dropdown/datalist label with title, 6-digit ID badge, and calling
 */
export function getMemberDisplayWithTitle(member: Member): string {
  const titleName = formatHonorificName(member.name, member);
  const idBadge = (member.members_id || member.member_id) ? ` #${member.members_id || member.member_id}` : '';
  return member.calling ? `${titleName}${idBadge} (${member.calling})` : `${titleName}${idBadge}`;
}

/**
 * Tokenizes a name by stripping titles, punctuation, commas, and converting to lowercase tokens.
 */
export function tokenizeName(name?: string | null): string[] {
  if (!name || !name.trim()) return [];
  return name
    .toLowerCase()
    .replace(/^(brother|sister|elder|bishop|president|patriarch|bro\.|bro|sis\.|sis|eld\.|eld|bp\.|bp|pres\.|pres)\s+/i, '')
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0 && !/^(brother|sister|elder|bishop|president|patriarch|bro|sis|eld|bp|pres)$/.test(token));
}

/**
 * Robust name matcher that matches across "Last, First", "First Last", titles, and initials.
 */
export function namesMatch(nameA?: string | null, nameB?: string | null): boolean {
  if (!nameA || !nameB) return false;
  const rawA = nameA.trim().toLowerCase();
  const rawB = nameB.trim().toLowerCase();
  if (rawA === rawB) return true;

  const tokensA = tokenizeName(nameA);
  const tokensB = tokenizeName(nameB);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  // Exact normalized token comparison
  const strA = tokensA.join(' ');
  const strB = tokensB.join(' ');
  if (strA === strB) return true;

  // Set-based token intersection
  const setB = new Set(tokensB);
  const setA = new Set(tokensA);
  const intersect = tokensA.filter((t) => setB.has(t));

  // If both have 2+ name tokens and share at least 2 tokens (e.g. First and Last name in any order)
  if (tokensA.length >= 2 && tokensB.length >= 2 && intersect.length >= 2) {
    return true;
  }

  // If one name is a subset of the other
  if (tokensA.length > 0 && tokensA.every((t) => setB.has(t))) return true;
  if (tokensB.length > 0 && tokensB.every((t) => setA.has(t))) return true;

  // Handle single-token match
  if (tokensA.length === 1 && tokensB.includes(tokensA[0]) && tokensA[0].length >= 3) return true;
  if (tokensB.length === 1 && tokensA.includes(tokensB[0]) && tokensB[0].length >= 3) return true;

  return false;
}

/**
 * Searches a list of members for a matching member record using ID or robust name matching.
 */
export function findMemberInList(nameOrId?: string | null, members: Member[] = []): Member | undefined {
  if (!nameOrId || !nameOrId.trim()) return undefined;
  const target = nameOrId.trim();
  const list = members.length > 0 ? members : _MEMBERS_CACHE;
  if (list.length === 0) return undefined;

  // 1. Direct ID match (6-digit member_id or members_id)
  const idMatch = list.find((m) => (m.member_id === target || m.members_id === target));
  if (idMatch) return idMatch;

  // 2. Name matching
  return list.find((m) => namesMatch(m.name, target));
}

/**
 * Finds a member's email address by name using robust matching across the directory.
 */
export function getMemberEmail(name?: string | null, members: Member[] = []): string {
  const match = findMemberInList(name, members);
  return match?.email?.trim() || '';
}
