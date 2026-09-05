-- Allow expense_statement(0 / NULL) to return every category.

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
