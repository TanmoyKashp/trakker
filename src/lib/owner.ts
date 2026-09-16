export const OWNER_EMAIL = "tanmoykashyap331@gmail.com";
export const OWNER_UID = "Q1HVzkoE5ZUcACfuaQoLPBSPsdJ2";

/**
 * Validates if the authenticated user is the verified owner of the PhD module.
 * Only tanmoykashyap331@gmail.com may access the PhD system and dataset.
 */
export function isOwnerUser(user?: { email?: string | null; uid?: string | null } | null): boolean {
  if (!user) return false;
  if (user.email && user.email.toLowerCase().trim() === OWNER_EMAIL) return true;
  if (user.uid && user.uid === OWNER_UID) return true;
  return false;
}
