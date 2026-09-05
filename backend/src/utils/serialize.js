const pad = (n) => String(n).padStart(2, '0');

/**
 * Renders a Date as 'YYYY-MM-DD HH:mm:ss' in local time so JSON keeps the
 * shape the frontend already parses (the MySQL pool used dateStrings).
 */
const formatTimestamp = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
  `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

/**
 * Walk a response payload and turn Date values into timestamp strings.
 */
export const normalizeDates = (value, depth = 0) => {
  if (depth > 12) return value;
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return formatTimestamp(value);
  if (Array.isArray(value)) return value.map((v) => normalizeDates(v, depth + 1));
  if (typeof value === 'object') {
    if (Buffer.isBuffer(value)) return value;
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalizeDates(v, depth + 1);
    return out;
  }
  return value;
};

export default normalizeDates;
