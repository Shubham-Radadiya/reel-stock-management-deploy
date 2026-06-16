/** Matrix shade column order: N first, then G, then others alphabetically. */
const shadeSortRank = (shade) => {
  const s = String(shade ?? '').trim().toUpperCase();
  if (s === 'N') return 0;
  if (s === 'G') return 1;
  return 2;
};

const compareNumericField = (a, b) => {
  const na = parseFloat(a);
  const nb = parseFloat(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true });
};

/** Sort matrix BF|GSM columns: shade (N, G, …) → BF asc → GSM asc. */
export const compareMatrixCombinations = (a, b) => {
  const shadeA = shadeSortRank(a.shade);
  const shadeB = shadeSortRank(b.shade);
  if (shadeA !== shadeB) return shadeA - shadeB;

  const shadeStr = String(a.shade ?? '').localeCompare(String(b.shade ?? ''), undefined, {
    sensitivity: 'base'
  });
  if (shadeA >= 2 && shadeStr !== 0) return shadeStr;

  const bfCmp = compareNumericField(a.bf, b.bf);
  if (bfCmp !== 0) return bfCmp;

  return compareNumericField(a.gsm, b.gsm);
};

export const sortMatrixCombinations = (combinations) =>
  [...combinations].sort(compareMatrixCombinations);
