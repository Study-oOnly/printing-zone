// Ignore letter case and extra spaces when comparing names
export function normName(s) {
  return (s || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function sameName(a, b) {
  return normName(a) === normName(b);
}

// A safe, unique key for a name (used to make sure a name is taken only once)
export function nameKey(s) {
  return "n_" + encodeURIComponent(normName(s));
}