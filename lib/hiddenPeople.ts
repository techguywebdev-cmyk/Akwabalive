/** Accounts that never show up as people to follow: the admin and test accounts */
export const HIDDEN_USERNAMES = new Set(['leoheart', 'davidhub8080']);
export const isHiddenPerson = (username?: string | null) => !!username && HIDDEN_USERNAMES.has(username.toLowerCase());
