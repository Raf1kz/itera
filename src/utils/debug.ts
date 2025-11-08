/**
 * Debug utilities and telemetry
 * Controlled by DEBUG_MODE flag
 */

// Enable debug mode via environment variable or hardcode for development
export const DEBUG_MODE = import.meta.env['VITE_DEBUG_MODE'] === 'true' || false;

/**
 * Conditional console.log wrapper
 */
export function debug(...args: any[]) {
  if (DEBUG_MODE) {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * Conditional console.warn wrapper
 */
export function debugWarn(...args: any[]) {
  if (DEBUG_MODE) {
    console.warn('[DEBUG-WARN]', ...args);
  }
}

/**
 * Conditional console.error wrapper
 */
export function debugError(...args: any[]) {
  if (DEBUG_MODE) {
    console.error('[DEBUG-ERROR]', ...args);
  }
}

/**
 * Performance timing wrapper
 */
export function debugTime(label: string) {
  if (DEBUG_MODE) {
    console.time(`[PERF] ${label}`);
  }
}

export function debugTimeEnd(label: string) {
  if (DEBUG_MODE) {
    console.timeEnd(`[PERF] ${label}`);
  }
}

/**
 * Log cluster formation statistics
 */
export function debugClusterStats(stats: {
  totalClusters: number;
  totalCards: number;
  avgClusterSize: number;
  maxClusterSize: number;
  minClusterSize: number;
  singletonClusters: number;
}) {
  if (DEBUG_MODE) {
    console.group('[CLUSTER-STATS]');
    console.log('Total Clusters:', stats.totalClusters);
    console.log('Total Cards:', stats.totalCards);
    console.log('Avg Cluster Size:', stats.avgClusterSize.toFixed(2));
    console.log('Max Cluster Size:', stats.maxClusterSize);
    console.log('Min Cluster Size:', stats.minClusterSize);
    console.log('Singleton Clusters:', stats.singletonClusters);
    console.groupEnd();
  }
}

/**
 * Log Bloom level distribution
 */
export function debugBloomDistribution(distribution: Record<string, number>) {
  if (DEBUG_MODE) {
    console.group('[BLOOM-DISTRIBUTION]');
    Object.entries(distribution).forEach(([level, count]) => {
      console.log(`${level}: ${count}`);
    });
    console.groupEnd();
  }
}

/**
 * Log goal planner diagnostics
 */
export function debugGoalPlanner(diagnostics: {
  selectedCardsCount: number;
  avgStability: number;
  avgDifficulty: number;
  bloomLevels: Record<string, number>;
  breakdown: {
    overdue: number;
    dueToday: number;
    dueSoon: number;
    new: number;
  };
}) {
  if (DEBUG_MODE) {
    console.group('[GOAL-PLANNER]');
    console.log('Selected Cards:', diagnostics.selectedCardsCount);
    console.log('Avg Stability:', diagnostics.avgStability.toFixed(2));
    console.log('Avg Difficulty:', diagnostics.avgDifficulty.toFixed(2));
    console.log('Breakdown:', diagnostics.breakdown);
    console.log('Bloom Levels:', diagnostics.bloomLevels);
    console.groupEnd();
  }
}

/**
 * Log schema validation results
 */
export function debugSchemaValidation(results: {
  valid: boolean;
  errors: string[];
  warnings: string[];
}) {
  if (DEBUG_MODE) {
    console.group('[SCHEMA-VALIDATION]');
    console.log('Valid:', results.valid);
    if (results.errors.length > 0) {
      console.error('Errors:', results.errors);
    }
    if (results.warnings.length > 0) {
      console.warn('Warnings:', results.warnings);
    }
    console.groupEnd();
  }
}
