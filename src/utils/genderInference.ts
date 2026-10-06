/**
 * Gender Inference Engine for Ward Members & Celebrants
 * 
 * Provides high-accuracy demographic inference for LDS honorific title assignment
 * (Sister vs Brother) when explicit gender is not recorded or cached on client devices.
 * 
 * Encompasses:
 * - Biblical & Christian canonical names
 * - Nigerian (Yoruba, Igbo, Hausa, Edo, Delta, Efik) traditional & contemporary names
 * - Common Western and Commonwealth international names
 */

export const FEMALE_NAME_TOKENS = new Set([
  // Biblical & Western Canonical
  'emma', 'mary', 'sarah', 'rachel', 'rebecca', 'rebekah', 'ruth', 'grace', 'mercy', 'faith',
  'blessing', 'joy', 'peace', 'comfort', 'patience', 'esther', 'deborah', 'hannah', 'elizabeth',
  'victoria', 'regina', 'princess', 'precious', 'gloria', 'judith', 'miriam', 'naomi', 'leah',
  'martha', 'priscilla', 'eunice', 'lydia', 'dorcas', 'chloe', 'tabitha', 'abigail', 'anna',
  'eva', 'eve', 'salome', 'claudia', 'susanna', 'joanna', 'rose', 'rosemary', 'florence',
  'helen', 'gladys', 'beatrice', 'theresa', 'patricia', 'caroline', 'catherine', 'ann', 'anne',
  'olivia', 'sophia', 'isabella', 'mia', 'charlotte', 'amelia', 'harper', 'evelyn', 'emily',
  'angela', 'jennifer', 'jessica', 'sandra', 'linda', 'brenda', 'laura', 'janet', 'dorothy',
  'shirley', 'juliet', 'juliana', 'alice', 'diana', 'julie', 'favour', 'gift', 'goodness',
  'praise', 'marvelous', 'miracle', 'promise', 'destiny', 'divine', 'hope', 'charity', 'merit',
  'treasure', 'queen', 'stella', 'rita', 'veronica', 'monica', 'clara', 'cecilia', 'bernice',
  'vivian', 'agatha', 'irene', 'joan', 'judy', 'lilian', 'lucy', 'mabel', 'nancy', 'pauline',
  'phyllis', 'roseline', 'sharon', 'charity', 'vera', 'felicia', 'doris', 'evelyn', 'theresa',
  'christiana', 'christine', 'cynthia', 'judith', 'judy', 'grace', 'maryann', 'jane',

  // Nigerian Yoruba Female Names & Indicators
  'titilayo', 'titi', 'ololade', 'folashade', 'funmilayo', 'funke', 'funmi', 'ronke', 'yetunde',
  'morayo', 'omowunmi', 'bose', 'bosede', 'bukola', 'bukunmi', 'kemi', 'yemi', 'eniola',
  'anuoluwapo', 'anu', 'modupe', 'dupe', 'bolanle', 'abimbola', 'ayomide', 'damilola', 'simisola',
  'tiwalade', 'adewunmi', 'adesewa', 'adenike', 'nike', 'omobola', 'omotola', 'omowumi',
  'ibironke', 'morenike', 'feyisayo', 'yewande', 'temitope', 'tolulope', 'tomiwa', 'adunni',
  'anike', 'abebi', 'abeke', 'asake', 'ayoka', 'folake', 'jumoke', 'kikelomo', 'labake',
  'mopelola', 'omofunke', 'titilola', 'toyin', 'wuraola', 'bisola', 'bimbo', 'sade', 'abosede',
  'ayaba', 'motunrayo', 'tunrayo', 'monisola', 'omobolanle', 'folasade', 'iyabo', 'omolara',
  'lara', 'remi', 'oluremi', 'aderonke', 'adejoke', 'funmilola', 'oluwabukola', 'oluwakemi',
  'oluwaseun', 'busayo', 'seun', 'bidemi', 'bolatito', 'idowu', 'enitan', 'omotayo',

  // Nigerian Igbo Female Names & Indicators
  'ngozi', 'chioma', 'chidinma', 'chinelo', 'chinwe', 'chinyere', 'amarachi', 'chiamaka',
  'ifunanya', 'adaeze', 'adaora', 'ada', 'amaka', 'nneka', 'uchechi', 'ijeoma', 'ogechi',
  'onyinye', 'somto', 'kosiso', 'chisom', 'somtochukwu', 'chimamanda', 'obianuju', 'uchechukwu',
  'ogechukwu', 'chizoba', 'ugochukwu', 'chinaza', 'chinagorom', 'ekene', 'chika', 'nkiru',
  'ndidi', 'ezinwa', 'oluchi', 'ngozi', 'ugochi', 'chinyelum', 'ngozi', 'ifeoma', 'amara',

  // Hausa / Northern Female Names
  'amina', 'aisha', 'fatima', 'zainab', 'hadiza', 'hauwa', 'mariam', 'halima', 'maryam',
  'asma\'u', 'habiba', 'rakiya', 'safiya', 'jummai', 'laraba', 'binta', 'bilkisu', 'kaltume',

  // Niger Delta / Edo / Urhobo Female Names
  'ebi', 'ogor', 'onome', 'ese', 'isioma', 'osariemen', 'efua', 'oviemuno', 'oghenekevwe',
  'ivie', 'omorose', 'ehis', 'osato', 'oghenero', 'omena'
]);

export const MALE_NAME_TOKENS = new Set([
  // Biblical & Western Canonical
  'julius', 'john', 'peter', 'paul', 'james', 'david', 'joseph', 'matthew', 'mark', 'luke',
  'thomas', 'stephen', 'samuel', 'daniel', 'michael', 'gabriel', 'emmanuel', 'victor',
  'charles', 'henry', 'william', 'richard', 'george', 'edward', 'robert', 'brian', 'anthony',
  'andrew', 'philip', 'simon', 'timothy', 'titus', 'barnabas', 'silas', 'alexander',
  'benjamin', 'nathan', 'joshua', 'caleb', 'isaac', 'jacob', 'abraham', 'moses', 'aaron',
  'elijah', 'elisha', 'solomon', 'jonathan', 'gideon', 'samson', 'noah', 'seth', 'enoch',
  'adam', 'ezra', 'nehemiah', 'felix', 'marcus', 'cornelius', 'vincent', 'martin', 'lawrence',
  'francis', 'dominic', 'bernard', 'leonard', 'patrick', 'kenneth', 'dennis', 'raymond',
  'albert', 'arthur', 'frederick', 'alfred', 'ernest', 'stanley', 'harold', 'walter',
  'clarence', 'donald', 'gerald', 'ronald', 'roger', 'douglas', 'kevin', 'jason', 'eric',
  'jeffrey', 'scott', 'gary', 'larry', 'justin', 'brandon', 'keith', 'craig', 'ian', 'colin',
  'neil', 'graham', 'christopher', 'nicholas', 'bruce', 'carl', 'gregory', 'frank',

  // Nigerian Yoruba Male Names & Indicators
  'oluwakayode', 'kayode', 'oluwadarasimi', 'babatunde', 'tunde', 'femi', 'olufemi', 'segun',
  'olusegun', 'ayodele', 'dele', 'kunle', 'adekunle', 'dapo', 'ladipo', 'korede', 'gbenga',
  'bode', 'olabode', 'olamide', 'olumide', 'olaoluwa', 'oluwasegun', 'fiyinfoluwa', 'boluwatife',
  'ayomikun', 'toluwanimi', 'oluwatosin', 'tosin', 'jide', 'babajide', 'femisayo', 'olawale',
  'wale', 'sola', 'shola', 'lanre', 'olanrewaju', 'rotimi', 'sunday', 'monday', 'kola',
  'kolawole', 'kazeem', 'dare', 'damilare', 'folarin', 'bamidele', 'ayotunde', 'adewale',
  'adesoji', 'adeniyi', 'adebayo', 'adeola', 'ademola', 'adeboye', 'adeyemi', 'abayomi',
  'akindele', 'akinola', 'akin', 'babayemi', 'olubunmi', 'oluwole', 'taiwo', 'kehinde',

  // Nigerian Igbo Male Names & Indicators
  'chukwudi', 'emeka', 'chinedu', 'tochukwu', 'ikechukwu', 'obinna', 'chibuike', 'chidi',
  'ebuka', 'kenechukwu', 'chukwuma', 'chukwuemeka', 'chinonso', 'uzoma', 'ugochukwu', 'ifeanyi',
  'nnamdi', 'uche', 'chima', 'nonso', 'onyekachi', 'chidera', 'somadina', 'chidubem',
  'uchenna', 'ogechukwu', 'okey', 'okwudili', 'emeka', 'kanu', 'nkemdirim',

  // Hausa / Northern Male Names
  'ibrahim', 'musa', 'usman', 'aliyu', 'umar', 'abubakar', 'ahmad', 'ahmed', 'muhammad',
  'bello', 'shehu', 'garba', 'sani', 'idris', 'yakubu', 'haruna', 'lawal', 'danladi',
  'mustapha', 'suleiman', 'aminu', 'tijjani'
]);

/**
 * Accurately infers gender ('F' | 'M' | null) from a person's name tokens.
 */
export function inferGenderFromName(rawName?: unknown): 'F' | 'M' | null {
  if (!rawName) return null;
  const str = String(rawName).toLowerCase()
    .replace(/^(brother|sister|elder|bishop|president|patriarch|bro\.|bro|sis\.|sis|bp\.|bp|eld\.|eld|pres\.|pres)\s+/i, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim();
  if (!str) return null;

  const tokens = str.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  let femaleMatches = 0;
  let maleMatches = 0;

  for (const token of tokens) {
    if (FEMALE_NAME_TOKENS.has(token)) femaleMatches++;
    if (MALE_NAME_TOKENS.has(token)) maleMatches++;
  }

  if (femaleMatches > maleMatches) return 'F';
  if (maleMatches > femaleMatches) return 'M';

  // In tie situations, check specific unambiguous female names that appear as middle/first names
  if (femaleMatches > 0 && femaleMatches === maleMatches) {
    for (const t of tokens) {
      if (['titilayo', 'emma', 'regina', 'ebi', 'mary', 'sarah', 'rachel', 'ruth', 'grace', 'mercy', 'elizabeth'].includes(t)) {
        return 'F';
      }
      if (['julius', 'john', 'peter', 'paul', 'david', 'oluwakayode', 'oluwadarasimi'].includes(t)) {
        return 'M';
      }
    }
  }

  return null;
}
