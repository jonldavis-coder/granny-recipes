export function formatMinutes(mins) {
  const n = Math.max(0, Math.round(Number(mins) || 0));
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (!m) return h === 1 ? "1 hr" : `${h} hr`;
  return `${h} hr ${m} min`;
}

export function isoDuration(mins) {
  const n = Math.max(0, Math.round(Number(mins) || 0));
  if (!n) return null;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return `PT${h ? `${h}H` : ""}${m}M`;
}

export function formatRating(avg, count) {
  const n = Number(count) || 0;
  if (!n) return "No ratings yet";
  const value = (Math.round(Number(avg) * 10) / 10).toFixed(1);
  const starWord = value === "1.0" ? "star" : "stars";
  const voteWord = n === 1 ? "rating" : "ratings";
  return `${value} ${starWord} from ${n} ${voteWord}`;
}

export function formatHearts(count) {
  const n = Number(count) || 0;
  if (!n) return "No favorites yet";
  if (n === 1) return "1 favorite";
  return `${n} favorites`;
}

export function formatWhen(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
