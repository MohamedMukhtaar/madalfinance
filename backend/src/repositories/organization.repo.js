import run from './_base.js';

export const get = (conn) =>
  run(conn, `SELECT * FROM organizations WHERE organization_id = 1 AND deleted_at IS NULL`).then(
    (rows) => rows[0]
  );

export const ensureRow = async (conn) => {
  const existing = await get(conn);
  if (existing) return existing;
  await run(conn, `INSERT INTO organizations (organization_id, name) VALUES (1, 'Madal ICT Solutions')`);
  return get(conn);
};

export const updateProfile = (conn, data) =>
  run(
    conn,
    `UPDATE organizations SET
        name          = COALESCE(?, name),
        founded_date  = ?,
        website_url   = ?,
        email         = ?,
        phone         = ?,
        address       = ?,
        city          = ?,
        postal_code   = ?,
        country       = ?,
        facebook_url  = ?,
        tiktok_url    = ?,
        instagram_url = ?,
        updated_at    = now()
     WHERE organization_id = 1`,
    [
      data.name ?? null,
      data.founded_date ?? null,
      data.website_url ?? null,
      data.email ?? null,
      data.phone ?? null,
      data.address ?? null,
      data.city ?? null,
      data.postal_code ?? null,
      data.country ?? null,
      data.facebook_url ?? null,
      data.tiktok_url ?? null,
      data.instagram_url ?? null,
    ]
  );

export const updateColors = (conn, data) =>
  run(
    conn,
    `UPDATE organizations SET
        primary_color       = COALESCE(?, primary_color),
        secondary_color     = COALESCE(?, secondary_color),
        sidebar_bg          = COALESCE(?, sidebar_bg),
        sidebar_text        = COALESCE(?, sidebar_text),
        sidebar_active_bg   = COALESCE(?, sidebar_active_bg),
        sidebar_active_text = COALESCE(?, sidebar_active_text),
        updated_at          = now()
     WHERE organization_id = 1`,
    [
      data.primary_color ?? null,
      data.secondary_color ?? null,
      data.sidebar_bg ?? null,
      data.sidebar_text ?? null,
      data.sidebar_active_bg ?? null,
      data.sidebar_active_text ?? null,
    ]
  );

export const IMAGE_COLUMNS = {
  light: 'logo_url',
  dark: 'logo_dark_url',
  icon: 'icon_url',
  signature: 'signature_url',
};

export const setImage = (conn, kind, filename) => {
  const col = IMAGE_COLUMNS[kind];
  if (!col) throw new Error(`Unknown organization image kind: ${kind}`);
  return run(
    conn,
    `UPDATE organizations SET ${col} = ?, updated_at = now() WHERE organization_id = 1`,
    [filename]
  );
};

export const clearImage = (conn, kind) => {
  const col = IMAGE_COLUMNS[kind];
  if (!col) throw new Error(`Unknown organization image kind: ${kind}`);
  return run(
    conn,
    `UPDATE organizations SET ${col} = NULL, updated_at = now() WHERE organization_id = 1`
  );
};

export default { get, ensureRow, updateProfile, updateColors, setImage, clearImage, IMAGE_COLUMNS };
