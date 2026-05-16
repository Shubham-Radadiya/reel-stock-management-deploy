const STORAGE_KEY = 'reelMinStockDismissed';

const readAll = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeAll = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

/** Rule IDs the admin dismissed while still below minimum. */
export const getDismissedMinStockIds = (username) => {
  if (!username) return new Set();
  const all = readAll();
  return new Set(all[username] || []);
};

export const dismissMinStockRuleIds = (username, ruleIds) => {
  if (!username || !ruleIds?.length) return;
  const all = readAll();
  const set = new Set(all[username] || []);
  ruleIds.forEach((id) => set.add(id));
  all[username] = [...set];
  writeAll(all);
};

/** When stock recovers, clear dismiss so the next shortfall can notify again. */
export const syncDismissedWithLowRules = (username, currentlyLowRuleIds) => {
  if (!username) return;
  const all = readAll();
  const lowSet = new Set(currentlyLowRuleIds);
  const kept = (all[username] || []).filter((id) => lowSet.has(id));
  all[username] = kept;
  writeAll(all);
};

export const wasMinStockToastShown = (username, signature) => {
  if (!username || !signature) return false;
  return sessionStorage.getItem(`minStockToast:${username}:${signature}`) === '1';
};

export const markMinStockToastShown = (username, signature) => {
  if (!username || !signature) return;
  sessionStorage.setItem(`minStockToast:${username}:${signature}`, '1');
};
