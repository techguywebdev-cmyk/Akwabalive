import type { Comment } from '@/components/moments/types';

export type ThreadRow = { c: Comment; reply: boolean; to: Comment | null };

/**
 * Comments as a thread: each top-level comment followed by its replies (oldest first, one level deep so it
 * stays readable on a phone). `to` is the comment a reply answers, for "replying to @name".
 */
export function threadComments(list: Comment[], newestFirst = false): ThreadRow[] {
  const byId = new Map(list.map((c) => [c.id, c]));
  const rootOf = (c: Comment): Comment => {
    let r = c; const seen = new Set<string>();
    while (r.parent_id && byId.has(r.parent_id) && !seen.has(r.id)) { seen.add(r.id); r = byId.get(r.parent_id)!; }
    return r;
  };
  const roots = list.filter((c) => !c.parent_id || !byId.has(c.parent_id));
  const kids = new Map<string, Comment[]>();
  for (const c of list) {
    if (!c.parent_id || !byId.has(c.parent_id)) continue;
    const r = rootOf(c).id;
    kids.set(r, [...(kids.get(r) ?? []), c]);
  }
  const ordered = newestFirst ? [...roots].reverse() : roots;
  const out: ThreadRow[] = [];
  for (const r of ordered) {
    out.push({ c: r, reply: false, to: null });
    for (const k of (kids.get(r.id) ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at))) {
      out.push({ c: k, reply: true, to: byId.get(k.parent_id!) ?? null });
    }
  }
  return out;
}

export const commenterName = (c: Comment | null | undefined) => c?.profiles?.full_name || c?.profiles?.username || 'Someone';
