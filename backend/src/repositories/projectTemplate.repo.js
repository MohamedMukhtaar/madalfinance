import run from './_base.js';

const select = `
  SELECT t.*, pt.type_name AS project_type,
         (SELECT COUNT(*) FROM projects p
           WHERE p.template_id = t.template_id AND p.deleted_at IS NULL) AS customer_count
    FROM project_templates t
    JOIN project_types pt ON pt.project_type_id = t.project_type_id`;

export const list = (conn, { search, status } = {}) => {
  const conditions = [];
  const params = [];
  if (status) {
    conditions.push('t.status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(t.template_name ILIKE ? OR t.description ILIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return run(conn, `${select} ${where} ORDER BY t.template_name ASC`, params);
};

export const findById = (conn, id) =>
  run(conn, `${select} WHERE t.template_id = ?`, [id]).then((rows) => rows[0]);

export const findByName = (conn, name) =>
  run(conn, `${select} WHERE LOWER(t.template_name) = LOWER(?)`, [name]).then((rows) => rows[0]);

export const create = async (conn, data) => {
  const id = await run(
    conn,
    `INSERT INTO project_templates (
        template_name, project_type_id, description, project_price,
        monthly_amount, setup_fee, billing_day, status, created_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.template_name,
      data.project_type_id,
      data.description ?? null,
      data.project_price ?? 0,
      data.monthly_amount ?? 0,
      data.setup_fee ?? 0,
      data.billing_day ?? 1,
      data.status ?? 'active',
      data.created_by ?? null,
    ]
  ).then((r) => r.insertId);
  return findById(conn, id);
};

export const update = async (conn, id, data) => {
  await run(
    conn,
    `UPDATE project_templates SET
        template_name   = COALESCE(?, template_name),
        description     = COALESCE(?, description),
        project_price   = COALESCE(?, project_price),
        monthly_amount  = COALESCE(?, monthly_amount),
        setup_fee       = COALESCE(?, setup_fee),
        billing_day     = COALESCE(?, billing_day),
        status          = COALESCE(?, status),
        updated_at      = now()
      WHERE template_id = ?`,
    [
      data.template_name ?? null,
      data.description ?? null,
      data.project_price ?? null,
      data.monthly_amount ?? null,
      data.setup_fee ?? null,
      data.billing_day ?? null,
      data.status ?? null,
      id,
    ]
  );
  return findById(conn, id);
};

export const remove = (conn, id) =>
  run(conn, `DELETE FROM project_templates WHERE template_id = ?`, [id]);

export const setLogo = (conn, id, { logo_path, logo_file_name }) =>
  run(conn, `UPDATE project_templates SET logo_path = ?, logo_file_name = ?, updated_at = now() WHERE template_id = ?`, [
    logo_path,
    logo_file_name,
    id,
  ]);

export const countAssignments = (conn, id) =>
  run(
    conn,
    `SELECT COUNT(*) AS total FROM projects WHERE template_id = ? AND deleted_at IS NULL`,
    [id]
  ).then((rows) => Number(rows[0]?.total ?? 0));

export default { list, findById, findByName, create, update, remove, setLogo, countAssignments };
