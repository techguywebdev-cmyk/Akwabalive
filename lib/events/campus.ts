/**
 * Campus nights: SRC weeks, hall weeks, artiste nights, freshers' nights. Student-run shows, not just anything that
 * happens to be at a university venue (a corporate concert at UPSA or a festival at the UG stadium isn't a campus night).
 */

/** Words that say students are putting it on */
export const CAMPUS_RE = /\b(src\s*(week|night|artiste|games|launch)|hall\s*week|artiste'?s?\s*night|students'?\s*(week|night|union)|freshers'?|fresher'?s|akwaaba\s*night|jcr|hall\s*(launch|night|bash|dinner|party)|campus\s*(night|tour|party|bash|rave|jam|concert)|watsup\s*on\s*campus|on\s*campus|matriculation\s*(party|night)|entertainment\s*night|hall\s*crawl)\b/i;

/** Schools, with the short name students use */
const SCHOOLS: [RegExp, string][] = [
  [/\b(university of ghana|legon|\bug\b|pentagon|evandy|bani hall|commonwealth hall|vandal|legon hall|akuafo|volta hall|mensah sarbah|sarbah|jean nelson|limann|hilla limann|kwapong|elizabeth sey|alex kwapong|international students'? hostel|tf hostel|tf xperience)/i, 'Legon'],
  [/\b(knust|kwame nkrumah university|unity hall|conti\b|katanga|university hall|queens hall|africa hall|independence hall|republic hall|brunei|gaza hostel)/i, 'KNUST'],
  [/\b(university of cape coast|\bucc\b|atlantic hall|casford|valco hall|oguaa hall|adehye hall|kwame nkrumah hall)/i, 'UCC'],
  [/\b(upsa|university of professional studies)/i, 'UPSA'],
  [/\b(gimpa)/i, 'GIMPA'],
  [/\b(ashesi)/i, 'Ashesi'],
  [/\b(central university)/i, 'Central'],
  [/\b(\buew\b|university of education,? winneba|winneba)/i, 'UEW'],
  [/\b(\buds\b|university for development studies)/i, 'UDS'],
  [/\b(umat|university of mines)/i, 'UMaT'],
  [/\b(\brmu\b|regional maritime)/i, 'RMU'],
  [/\b(unimac|university of media)/i, 'UniMAC'],
  [/\b(\buhas\b|university of health and allied)/i, 'UHAS'],
  [/\b(uenr|university of energy)/i, 'UENR'],
  [/\b(\bktu\b|koforidua technical)/i, 'KTU'],
  [/\b(\bstu\b|sunyani technical)/i, 'STU'],
  [/\b(\batu\b|accra technical)/i, 'ATU'],
  [/\b(\bttu\b|takoradi technical)/i, 'TTU'],
  [/\b(\bkstu\b|kumasi technical)/i, 'KsTU'],
  [/\b(\bhtu\b|ho technical)/i, 'HTU'],
  [/\b(\bccu\b|catholic university|valley view|\bvvu\b|wisconsin|lancaster university ghana|academic city|pentecost university|methodist university|presbyterian university|\bhcu\b|heritage christian)/i, 'Campus'],
];

type Campusy = { title: string; venue?: string | null; description?: string | null; highlight?: string | null; tags?: string[] | null };

/** The school's short name when this is a campus night, else null */
export function campusOf(e: Campusy): string | null {
  const own = `${e.title} ${e.highlight ?? ''} ${(e.tags ?? []).join(' ')}`;
  const all = `${own} ${e.venue ?? ''} ${(e.description ?? '').slice(0, 600)}`;
  if (!CAMPUS_RE.test(own) && !CAMPUS_RE.test((e.description ?? '').slice(0, 600))) return null;
  return SCHOOLS.find(([re]) => re.test(all))?.[1] ?? 'Campus';
}

export const isCampus = (e: Campusy) => campusOf(e) !== null;
