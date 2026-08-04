/**
 * Builds the SQL fragments used for pagination, search, filtering and
 * sorting across list endpoints.
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * @param {{ page?: number|string, per_page?: number|string, sort?: string, search?: string }} query
 * @param {{ allowedSorts?: string[], defaultSort?: string }} [opts]
 *   `allowedSorts` is a whitelist of ORDER BY columns (prevents SQL injection
 *   and ambiguous-column errors). Falls back to `defaultSort` when the
 *   requested column is not whitelisted.
 * @returns {{ limit: number, offset: number, page: number, perPage: number, order: string, search: string|undefined }}
 */
export const parseListQuery = (query, { allowedSorts = [], defaultSort = 'created_at:desc' } = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const perPage = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(query.per_page, 10) || DEFAULT_PAGE_SIZE)
  );
  const offset = (page - 1) * perPage;
  const sort = typeof query.sort === 'string' && query.sort ? query.sort : defaultSort;
  const [sortCol, sortDirRaw] = sort.split(':');
  const col = allowedSorts.length && !allowedSorts.includes(sortCol) ? defaultSort.split(':')[0] : sortCol;
  const sortDir = sortDirRaw && sortDirRaw.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const search = query.search ? String(query.search).trim() : undefined;

  return { page, perPage, offset, sortCol: col, sortDir, order: `${col} ${sortDir}`, search };
};

export const paginationMeta = (page, perPage, total) => ({
  page,
  per_page: perPage,
  total,
  total_pages: Math.ceil(total / perPage),
});
