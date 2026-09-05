const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Renders a Date as 'YYYY-MM-DD HH:mm:ss' in local time.
 *
 * The MySQL pool ran with `dateStrings: true`, so DATETIME/TIMESTAMP columns
 * reached the frontend as exactly this format with no timezone suffix. The
 * PostgreSQL driver hands back Date objects instead, and letting those go
 * through JSON.stringify would emit ISO-8601 with a 'Z' — shifting every
 * displayed time by the UTC offset. Local getters are correct here because
 * the columns are TIMESTAMP WITHOUT TIME ZONE, so the Date already holds the
 * stored wall-clock value.
 */
const formatTimestamp = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
  `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const hasToJSON = (v: object): v is { toJSON: () => unknown } =>
  typeof (v as { toJSON?: unknown }).toJSON === 'function';

/**
 * Walks a response payload and normalises Date values, unwrapping Sequelize
 * model instances along the way. Depth is bounded so a cyclic association
 * can't hang the response.
 */
export const normalizeDates = (value: unknown, depth = 0): unknown => {
  if (depth > 12) return value;
  if (value === null || value === undefined) return value;

  if (value instanceof Date) return formatTimestamp(value);
  if (Array.isArray(value)) return value.map((v) => normalizeDates(v, depth + 1));

  if (typeof value === 'object') {
    if (Buffer.isBuffer(value)) return value;

    // Sequelize instances carry their columns behind toJSON().
    if (hasToJSON(value)) return normalizeDates(value.toJSON(), depth + 1);

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalizeDates(v, depth + 1);
    return out;
  }

  return value;
};

export default normalizeDates;
