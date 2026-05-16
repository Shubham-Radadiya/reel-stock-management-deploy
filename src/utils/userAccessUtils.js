/** Report sub-tab ids (must match Report.js). */
export const REPORT_TAB_IDS = ['matrix', 'analytics', 'reelchart', 'minimum'];

export const REPORT_TAB_LABELS = {
  matrix: 'Matrix',
  analytics: 'Analytics',
  reelchart: 'Reel Chart',
  minimum: 'Minimum stock'
};

export const fullAccess = () => ({
  reports: true,
  matrix: true,
  analytics: true,
  reelchart: true,
  minimum: true
});

export const defaultAccess = () => ({
  reports: false,
  matrix: false,
  analytics: false,
  reelchart: false,
  minimum: false
});

/** Existing users created before access control: Matrix + Analytics only. */
export const legacyUserAccess = () => ({
  reports: true,
  matrix: true,
  analytics: true,
  reelchart: false,
  minimum: false
});

/**
 * Normalize access from API user object.
 * Admins always receive full access on the client for display; server enforces admin too.
 */
export function resolveUserAccess(user) {
  if (!user) return defaultAccess();
  if (user.role === 'admin') return fullAccess();

  const raw = user.access;
  if (raw && typeof raw === 'object' && ('reports' in raw || 'matrix' in raw)) {
    return {
      reports: Boolean(raw.reports),
      matrix: Boolean(raw.matrix),
      analytics: Boolean(raw.analytics),
      reelchart: Boolean(raw.reelchart),
      minimum: Boolean(raw.minimum)
    };
  }

  return legacyUserAccess();
}

export function canUseReportsNav(access) {
  if (!access?.reports) return false;
  return REPORT_TAB_IDS.some((id) => access[id]);
}

export function getAllowedReportTabs(access) {
  if (!access?.reports) return [];
  return REPORT_TAB_IDS.filter((id) => access[id]);
}

export function formatAccessSummary(access) {
  if (!access?.reports) return 'Entries only';
  const labels = getAllowedReportTabs(access).map((id) => REPORT_TAB_LABELS[id]);
  return labels.length ? labels.join(', ') : 'Reports (no sections)';
}
