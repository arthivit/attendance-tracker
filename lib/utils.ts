export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function todayISO() {
  // YYYY-MM-DD in LOCAL time
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}
