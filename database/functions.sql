-- ============================================================
-- MADAL FINANCE — STATEMENT FUNCTIONS
-- Stage 2. Run after schema.sql + app_support.sql
--
-- Statement format:
-- Date | Time | Type | Reference | Debit | Credit | Loan | Balance
-- PostgreSQL 14+
-- ============================================================

DROP FUNCTION IF EXISTS account_statement(BIGINT, DATE, DATE);
DROP FUNCTION IF EXISTS expense_statement(BIGINT, DATE, DATE);
DROP FUNCTION IF EXISTS member_statement(BIGINT, DATE, DATE);
DROP FUNCTION IF EXISTS project_statement(BIGINT, DATE, DATE);
DROP FUNCTION IF EXISTS customer_statement(BIGINT, DATE, DATE);
DROP FUNCTION IF EXISTS salary_statement(BIGINT, DATE, DATE);

CREATE OR REPLACE FUNCTION account_statement(
    p_account_id BIGINT,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    "ID"        BIGINT,
    "Name"      VARCHAR(100),
    "Phone"     VARCHAR(100),
    "Type"      VARCHAR(50),
    "Reference" VARCHAR(50),
    "Date"      DATE,
    "Time"      TIME,
    "Dr"        NUMERIC(14,2),
    "Cr"        NUMERIC(14,2),
    "Loan"      NUMERIC(14,2),
    "Balance"   NUMERIC(14,2)
)
LANGUAGE sql
AS $$
    WITH opening AS (
        SELECT
            COALESCE((SELECT opening_balance FROM accounts WHERE account_id = p_account_id), 0)
            + COALESCE(
                (SELECT SUM(debit + loan - credit)
                   FROM transactions
                  WHERE account_id = p_account_id
                    AND transaction_date::DATE < p_start_date),
                0
            ) AS opening_balance
    ),
    period AS (
        SELECT
            a.account_id AS "ID",
            a.account_name AS "Name",
            a.account_number AS "Phone",
            t.reference_type AS "Type",
            t.reference_type || '-' || LPAD(t.reference_id::TEXT, 6, '0') AS "Reference",
            t.transaction_date::DATE AS "Date",
            t.transaction_date::TIME AS "Time",
            t.debit AS "Dr",
            t.credit AS "Cr",
            t.loan AS "Loan",
            t.transaction_date,
            t.transaction_id
        FROM transactions t
        JOIN accounts a ON a.account_id = t.account_id
        WHERE t.account_id = p_account_id
          AND t.transaction_date::DATE BETWEEN p_start_date AND p_end_date
    )
    SELECT
        a.account_id,
        a.account_name,
        a.account_number,
        'Opening'::VARCHAR(50),
        'OPEN'::VARCHAR(50),
        p_start_date,
        '00:00:00'::TIME,
        0::NUMERIC,
        0::NUMERIC,
        0::NUMERIC,
        o.opening_balance
    FROM accounts a
    CROSS JOIN opening o
    WHERE a.account_id = p_account_id
      AND o.opening_balance <> 0

    UNION ALL

    SELECT
        p."ID",
        p."Name",
        p."Phone",
        p."Type",
        p."Reference",
        p."Date",
        p."Time",
        p."Dr",
        p."Cr",
        p."Loan",
        o.opening_balance + SUM(p."Dr" + p."Loan" - p."Cr") OVER (
            ORDER BY p.transaction_date, p.transaction_id
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        )
    FROM period p
    CROSS JOIN opening o
    ORDER BY 6, 7, 5;
$$;

CREATE OR REPLACE FUNCTION expense_statement(
    p_expense_id BIGINT,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    "ID"        BIGINT,
    "Name"      VARCHAR(100),
    "Type"      VARCHAR(20),
    "Reference" VARCHAR(50),
    "Date"      DATE,
    "Time"      TIME,
    "Dr"        NUMERIC(14,2),
    "Cr"        NUMERIC(14,2),
    "Balance"   NUMERIC(14,2)
)
LANGUAGE sql
AS $$
    WITH movements AS (
        SELECT
            e.expense_id AS id,
            e.expense_name AS name,
            'Expense'::VARCHAR(20) AS type,
            ec.charge_number AS reference,
            ec.charge_date::DATE AS dt,
            ec.charge_date::TIME AS tm,
            ec.amount AS dr,
            0::NUMERIC AS cr
        FROM expense_charges ec
        JOIN expenses e ON e.expense_id = ec.expense_id
        WHERE p_expense_id IS NULL OR p_expense_id = 0 OR ec.expense_id = p_expense_id

        UNION ALL

        SELECT
            e.expense_id,
            e.expense_name,
            'Payment'::VARCHAR(20),
            ep.payment_number,
            ep.payment_date::DATE,
            ep.payment_date::TIME,
            0::NUMERIC,
            ep.amount
        FROM expense_payments ep
        JOIN expense_charges ec ON ec.expense_charge_id = ep.expense_charge_id
        JOIN expenses e ON e.expense_id = ec.expense_id
        WHERE p_expense_id IS NULL OR p_expense_id = 0 OR ec.expense_id = p_expense_id
    ),
    opening AS (
        SELECT COALESCE(SUM(dr - cr), 0) AS opening_balance
        FROM movements
        WHERE dt < p_start_date
    )
    SELECT
        m.id,
        m.name,
        m.type,
        m.reference,
        m.dt,
        m.tm,
        m.dr,
        m.cr,
        o.opening_balance + SUM(m.dr - m.cr) OVER (
            ORDER BY m.dt, m.tm, m.reference
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        )
    FROM movements m
    CROSS JOIN opening o
    WHERE m.dt BETWEEN p_start_date AND p_end_date
    ORDER BY 5, 6, 4;
$$;

CREATE OR REPLACE FUNCTION member_statement(
    p_member_id BIGINT,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    "ID"         BIGINT,
    "Name"       VARCHAR(150),
    "Phone"      VARCHAR(30),
    "Type"       VARCHAR(20),
    "Reference"  VARCHAR(50),
    "Date"       DATE,
    "Time"       TIME,
    "Dr"         NUMERIC(14,2),
    "Cr"         NUMERIC(14,2),
    "Loan"       NUMERIC(14,2),
    "Balance"    NUMERIC(14,2)
)
LANGUAGE sql
AS $$
    WITH movements AS (
        SELECT
            m.member_id AS id,
            m.full_name AS name,
            m.phone,
            'Due'::VARCHAR(20) AS type,
            'DUE-' || LPAD(md.due_id::TEXT, 6, '0') AS reference,
            mb.generated_at::DATE AS dt,
            mb.generated_at::TIME AS tm,
            md.amount AS dr,
            0::NUMERIC AS cr,
            0::NUMERIC AS loan
        FROM member_dues md
        JOIN member_due_batches mb ON mb.batch_id = md.batch_id
        JOIN members m ON m.member_id = md.member_id
        WHERE md.member_id = p_member_id

        UNION ALL

        SELECT
            m.member_id,
            m.full_name,
            m.phone,
            'Payment'::VARCHAR(20),
            'MDP-' || LPAD(mdp.payment_id::TEXT, 6, '0'),
            mdp.paid_at::DATE,
            mdp.paid_at::TIME,
            0::NUMERIC,
            mdp.amount,
            0::NUMERIC
        FROM member_due_payments mdp
        JOIN members m ON m.member_id = mdp.member_id
        WHERE mdp.member_id = p_member_id

        UNION ALL

        SELECT
            m.member_id,
            m.full_name,
            m.phone,
            'Loan'::VARCHAR(20),
            'LOAN-' || LPAD(ml.loan_id::TEXT, 6, '0'),
            ml.loan_date::DATE,
            ml.loan_date::TIME,
            0::NUMERIC,
            0::NUMERIC,
            ml.amount
        FROM member_loans ml
        JOIN members m ON m.member_id = ml.member_id
        WHERE ml.member_id = p_member_id

        UNION ALL

        SELECT
            m.member_id,
            m.full_name,
            m.phone,
            'Loan Pay'::VARCHAR(20),
            'LP-' || LPAD(mlp.loan_payment_id::TEXT, 6, '0'),
            mlp.paid_at::DATE,
            mlp.paid_at::TIME,
            0::NUMERIC,
            mlp.amount,
            0::NUMERIC
        FROM member_loan_payments mlp
        JOIN members m ON m.member_id = mlp.member_id
        WHERE mlp.member_id = p_member_id
    ),
    opening AS (
        SELECT COALESCE(SUM(dr + loan - cr), 0) AS opening_balance
        FROM movements
        WHERE dt < p_start_date
    )
    SELECT
        m.id,
        m.name,
        m.phone,
        m.type,
        m.reference,
        m.dt,
        m.tm,
        m.dr,
        m.cr,
        m.loan,
        o.opening_balance + SUM(m.dr + m.loan - m.cr) OVER (
            ORDER BY m.dt, m.tm, m.reference
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        )
    FROM movements m
    CROSS JOIN opening o
    WHERE m.dt BETWEEN p_start_date AND p_end_date
    ORDER BY 6, 7, 5;
$$;

CREATE OR REPLACE FUNCTION project_statement(
    p_project_id BIGINT,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    "ID"        BIGINT,
    "Name"      VARCHAR(200),
    "Type"      VARCHAR(20),
    "Reference" VARCHAR(50),
    "Date"      DATE,
    "Time"      TIME,
    "Dr"        NUMERIC(14,2),
    "Cr"        NUMERIC(14,2),
    "Balance"   NUMERIC(14,2)
)
LANGUAGE sql
AS $$
    WITH movements AS (
        SELECT
            p.project_id AS id,
            p.project_name AS name,
            'Invoice'::VARCHAR(20) AS type,
            i.invoice_number AS reference,
            i.invoice_date AS dt,
            '00:00:00'::TIME AS tm,
            i.total_amount AS dr,
            0::NUMERIC AS cr
        FROM invoices i
        JOIN projects p ON p.project_id = i.project_id
        WHERE i.project_id = p_project_id
          AND i.deleted_at IS NULL
          AND i.status <> 'Cancelled'

        UNION ALL

        SELECT
            p.project_id,
            p.project_name,
            'Payment'::VARCHAR(20),
            pay.payment_number,
            pay.payment_date::DATE,
            pay.payment_date::TIME,
            0::NUMERIC,
            pa.amount_allocated
        FROM payments pay
        JOIN payment_allocations pa ON pa.payment_id = pay.payment_id
        JOIN invoices i ON i.invoice_id = pa.invoice_id
        JOIN projects p ON p.project_id = i.project_id
        WHERE i.project_id = p_project_id
          AND pay.deleted_at IS NULL
          AND pay.status = 'Completed'
    ),
    opening AS (
        SELECT COALESCE(SUM(dr - cr), 0) AS opening_balance
        FROM movements
        WHERE dt < p_start_date
    )
    SELECT
        m.id,
        m.name,
        m.type,
        m.reference,
        m.dt,
        m.tm,
        m.dr,
        m.cr,
        o.opening_balance + SUM(m.dr - m.cr) OVER (
            ORDER BY m.dt, m.tm, m.reference
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        )
    FROM movements m
    CROSS JOIN opening o
    WHERE m.dt BETWEEN p_start_date AND p_end_date
    ORDER BY 5, 6, 4;
$$;

CREATE OR REPLACE FUNCTION customer_statement(
    p_customer_id BIGINT,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    "ID"         BIGINT,
    "Name"       VARCHAR(150),
    "Phone"      VARCHAR(30),
    "Type"       VARCHAR(20),
    "Reference"  VARCHAR(50),
    "Date"       DATE,
    "Time"       TIME,
    "Dr"         NUMERIC(14,2),
    "Cr"         NUMERIC(14,2),
    "Balance"    NUMERIC(14,2)
)
LANGUAGE sql
AS $$
    WITH movements AS (
        SELECT
            c.customer_id AS id,
            c.customer_name AS name,
            c.phone,
            'Invoice'::VARCHAR(20) AS type,
            i.invoice_number AS reference,
            i.invoice_date AS dt,
            '00:00:00'::TIME AS tm,
            i.total_amount AS dr,
            0::NUMERIC AS cr
        FROM invoices i
        JOIN customers c ON c.customer_id = i.customer_id
        WHERE i.customer_id = p_customer_id
          AND i.deleted_at IS NULL
          AND i.status <> 'Cancelled'

        UNION ALL

        SELECT
            c.customer_id,
            c.customer_name,
            c.phone,
            'Payment'::VARCHAR(20),
            p.payment_number,
            p.payment_date::DATE,
            p.payment_date::TIME,
            0::NUMERIC,
            p.amount
        FROM payments p
        JOIN customers c ON c.customer_id = p.customer_id
        WHERE p.customer_id = p_customer_id
          AND p.deleted_at IS NULL
          AND p.status = 'Completed'
    ),
    opening AS (
        SELECT COALESCE(SUM(dr - cr), 0) AS opening_balance
        FROM movements
        WHERE dt < p_start_date
    )
    SELECT
        m.id,
        m.name,
        m.phone,
        m.type,
        m.reference,
        m.dt,
        m.tm,
        m.dr,
        m.cr,
        o.opening_balance + SUM(m.dr - m.cr) OVER (
            ORDER BY m.dt, m.tm, m.reference
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        )
    FROM movements m
    CROSS JOIN opening o
    WHERE m.dt BETWEEN p_start_date AND p_end_date
    ORDER BY 6, 7, 5;
$$;

CREATE OR REPLACE FUNCTION salary_statement(
    p_employee_id BIGINT,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    "ID"        BIGINT,
    "Name"      VARCHAR(200),
    "Phone"     VARCHAR(30),
    "Type"      VARCHAR(20),
    "Reference" VARCHAR(50),
    "Date"      DATE,
    "Time"      TIME,
    "Dr"        NUMERIC(14,2),
    "Cr"        NUMERIC(14,2),
    "Balance"   NUMERIC(14,2)
)
LANGUAGE sql
AS $$
    WITH movements AS (
        SELECT
            e.employee_id AS id,
            TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')))::VARCHAR(200) AS name,
            e.phone,
            'Charge'::VARCHAR(20) AS type,
            sc.charge_number AS reference,
            sc.charge_date::DATE AS dt,
            sc.charge_date::TIME AS tm,
            sc.net_salary AS dr,
            0::NUMERIC AS cr
        FROM salary_charges sc
        JOIN employees e ON e.employee_id = sc.employee_id
        WHERE sc.employee_id = p_employee_id
          AND sc.status <> 'Cancelled'

        UNION ALL

        SELECT
            e.employee_id,
            TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, ''))),
            e.phone,
            'Payment'::VARCHAR(20),
            sp.payment_number,
            sp.payment_date::DATE,
            sp.payment_date::TIME,
            0::NUMERIC,
            sp.amount
        FROM salary_payments sp
        JOIN employees e ON e.employee_id = sp.employee_id
        WHERE sp.employee_id = p_employee_id
          AND sp.status = 'Completed'
    ),
    opening AS (
        SELECT COALESCE(SUM(dr - cr), 0) AS opening_balance
        FROM movements
        WHERE dt < p_start_date
    )
    SELECT
        m.id,
        m.name,
        m.phone,
        m.type,
        m.reference,
        m.dt,
        m.tm,
        m.dr,
        m.cr,
        o.opening_balance + SUM(m.dr - m.cr) OVER (
            ORDER BY m.dt, m.tm, m.reference
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        )
    FROM movements m
    CROSS JOIN opening o
    WHERE m.dt BETWEEN p_start_date AND p_end_date
    ORDER BY 6, 7, 5;
$$;
