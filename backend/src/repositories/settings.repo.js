import run from './_base.js';

export const get = (conn) =>
  run(conn, `SELECT * FROM settings ORDER BY setting_id ASC LIMIT 1`).then((rows) => rows[0]);

export const update = (conn, data) => {
  const {
    company_name, company_phone, company_email, company_address, logo, currency,
    default_member_due, invoice_prefix, payment_prefix, contract_prefix, timezone,
  } = data;
  return run(
    conn,
    `UPDATE settings SET
        company_name       = COALESCE(?, company_name),
        company_phone      = COALESCE(?, company_phone),
        company_email      = COALESCE(?, company_email),
        company_address    = COALESCE(?, company_address),
        logo               = COALESCE(?, logo),
        currency           = COALESCE(?, currency),
        default_member_due = COALESCE(?, default_member_due),
        invoice_prefix     = COALESCE(?, invoice_prefix),
        payment_prefix     = COALESCE(?, payment_prefix),
        contract_prefix    = COALESCE(?, contract_prefix),
        timezone           = COALESCE(?, timezone)
     WHERE setting_id = (SELECT setting_id FROM (SELECT setting_id FROM settings ORDER BY setting_id ASC LIMIT 1) s)`,
    [
      company_name ?? null, company_phone ?? null, company_email ?? null, company_address ?? null,
      logo ?? null, currency ?? null, default_member_due ?? null, invoice_prefix ?? null,
      payment_prefix ?? null, contract_prefix ?? null, timezone ?? null,
    ]
  );
};

export const setLogo = (conn, filename) =>
  run(
    conn,
    `UPDATE settings SET logo = ?
     WHERE setting_id = (SELECT setting_id FROM (SELECT setting_id FROM settings ORDER BY setting_id ASC LIMIT 1) s)`,
    [filename]
  );

export const clearLogo = (conn) =>
  run(
    conn,
    `UPDATE settings SET logo = NULL
     WHERE setting_id = (SELECT setting_id FROM (SELECT setting_id FROM settings ORDER BY setting_id ASC LIMIT 1) s)`
  );

export default { get, update, setLogo, clearLogo };
