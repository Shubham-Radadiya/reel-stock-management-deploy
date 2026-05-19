const STORAGE_KEYS = {
  shade: 'reelStock_shadeOptions',
  bf: 'reelStock_bfOptions'
};

const DEFAULTS = {
  shade: ['N', 'G'],
  bf: ['16', '18']
};

const SHADE_EXCLUDED = new Set(['P']);

const sanitizeShadeOptions = (options) => {
  const filtered = options.filter(
    (o) => !SHADE_EXCLUDED.has(String(o).trim().toUpperCase())
  );
  return sortOptions('shade', filtered);
};

export const isShadeOptionExcluded = (value) =>
  SHADE_EXCLUDED.has(String(value ?? '').trim().toUpperCase());

const sortOptions = (field, options) => {
  const unique = [...new Set(options.map((o) => String(o).trim()).filter(Boolean))];
  if (field === 'bf') {
    return unique.sort((a, b) => {
      const na = parseFloat(a);
      const nb = parseFloat(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }
  return unique.sort((a, b) => a.localeCompare(b));
};

export const loadReelFieldOptions = (field) => {
  const key = STORAGE_KEYS[field];
  if (!key) return [...DEFAULTS[field]];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [...DEFAULTS[field]];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return [...DEFAULTS[field]];
    const sorted = sortOptions(field, parsed);
    if (field !== 'shade') return sorted;
    const sanitized = sanitizeShadeOptions(sorted);
    if (sanitized.length !== sorted.length) {
      localStorage.setItem(key, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch {
    return [...DEFAULTS[field]];
  }
};

export const saveReelFieldOptions = (field, options) => {
  const key = STORAGE_KEYS[field];
  if (!key) return;
  const sorted =
    field === 'shade' ? sanitizeShadeOptions(options) : sortOptions(field, options);
  localStorage.setItem(key, JSON.stringify(sorted));
  return sorted;
};

export const addReelFieldOption = (field, value, currentOptions) => {
  const trimmed =
    field === 'shade'
      ? String(value ?? '').trim().toUpperCase()
      : String(value ?? '').trim();

  if (!trimmed) {
    return { options: currentOptions, value: null, error: 'Enter a value' };
  }

  if (field === 'shade' && isShadeOptionExcluded(trimmed)) {
    return { options: currentOptions, value: null, error: 'This shade is not allowed' };
  }

  const exists = currentOptions.some(
    (opt) => opt.toLowerCase() === trimmed.toLowerCase()
  );
  if (exists) {
    return { options: currentOptions, value: trimmed, error: 'This option already exists' };
  }

  const next = saveReelFieldOptions(field, [...currentOptions, trimmed]);
  return { options: next, value: trimmed, error: null };
};

export const normalizeShadeValue = (value) => String(value ?? '').trim().toUpperCase();

export const normalizeBfValue = (value) => String(value ?? '').trim();
