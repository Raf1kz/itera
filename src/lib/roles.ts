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

  // Warn if admin IDs not configured
  if (!env || env.trim() === '') {
    console.error('[roles] VITE_ADMIN_USER_IDS environment variable is not set or empty');
    return false;
  }

  const rawAdminIds = env.split(',').map((s: string) => s.trim());
  const adminIds: string[] = [];

  // Validate each admin ID format
  for (const id of rawAdminIds) {
    if (!id) continue;

    if (!id.startsWith('user_')) {
      console.warn(`[roles] Invalid admin ID format: "${id}" - must start with "user_"`);
      continue;
    }

    adminIds.push(id);
  }

  if (adminIds.length === 0) {
    console.error('[roles] No valid admin IDs found after validation');
    return false;
  }

  const isUserAdmin = adminIds.includes(userId);

  // Log only in development mode
  if (import.meta.env.DEV) {
    console.log('[roles] Admin check:', {
      userId,
      isAdmin: isUserAdmin,
      validAdminCount: adminIds.length,
      totalConfigured: rawAdminIds.length,
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
