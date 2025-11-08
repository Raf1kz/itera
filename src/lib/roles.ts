/**
 * Role management utilities
 * Handles admin permissions and access control
 */

/**
 * Check if a user is an admin
 * @param userId - Clerk user ID to check
 * @returns true if user is in the admin list
 */
export function isAdmin(userId?: string | null): boolean {
  if (!userId) return false;

  const env = import.meta.env['VITE_ADMIN_USER_IDS'] ?? '';
  const adminIds = env
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);

  const isUserAdmin = adminIds.includes(userId);

  // Log only in development mode
  if (import.meta.env.DEV) {
    console.log('[roles] Admin check:', {
      userId,
      isAdmin: isUserAdmin,
      adminCount: adminIds.length,
    });
  }

  return isUserAdmin;
}

/**
 * Check if a feature is available to the user
 * @param userId - Clerk user ID
 * @param feature - Feature name to check
 * @returns true if user can access the feature
 */
export function canAccessFeature(userId: string | null | undefined, feature: string): boolean {
  // Admin can access everything
  if (isAdmin(userId)) return true;

  // Define feature availability for regular users
  const publicFeatures = [
    'generate',
    'decks',
    'summaries',
    'flashcard-study',
    'review'
  ];

  return publicFeatures.includes(feature);
}
