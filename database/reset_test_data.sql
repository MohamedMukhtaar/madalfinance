-- ============================================================
-- reset_test_data — wipe all business data for testing.
--
-- NOT part of the automatic migrations. Install it by hand, only on a
-- database you are willing to empty.
--
-- KEPT:    users, roles, settings (company details / logo / prefixes),
--          refresh_tokens (nobody is logged out), user_devices (no
--          device re-verification), migration history.
-- DELETED: customers, projects, contracts, invoices, payments, rentals,
--          members, dues, loans, employees, salaries, expense charges,
--          other income, transactions, transfers, audit logs, trash,
--          export jobs.
-- SETUP LISTS (accounts, expense categories, project types/templates,
--          departments, job titles, branches, shifts):
--          p_keep_setup = TRUE  (default) → kept; account balances are
--                                           reset to their opening balance
--          p_keep_setup = FALSE           → deleted as well
--
-- Usage:
--   CALL reset_test_data('DELETE ALL DATA');          -- keep setup lists
--   CALL reset_test_data('DELETE ALL DATA', FALSE);   -- delete them too
--
-- Uploaded files (receipts, photos, logos) live on disk under
-- backend/src/uploads and are not touched by this procedure.
-- ============================================================

CREATE OR REPLACE PROCEDURE reset_test_data(p_confirm TEXT, p_keep_setup BOOLEAN DEFAULT TRUE)
LANGUAGE plpgsql
AS $$
DECLARE
    business_tables TEXT[] := ARRAY[
        'trash_bin', 'audit_logs', 'export_jobs',
        'transactions', 'account_transfers',
        'expense_charge_attachments', 'expense_payments', 'expense_charges',
        'member_due_attachments', 'member_due_payments', 'member_dues', 'member_due_batches',
        'member_loan_payments', 'member_loans', 'members',
        'payment_attachments', 'payment_allocations', 'payments',
        'invoice_attachments', 'invoice_items', 'invoices',
        'rental_billings', 'contracts', 'project_customers', 'projects',
        'customer_contacts', 'customers',
        'other_income',
        'salary_payments', 'salary_charges', 'employees'
    ];
    setup_tables TEXT[] := ARRAY[
        'accounts', 'expenses', 'project_templates', 'project_types',
        'departments', 'job_titles', 'branches', 'shifts'
    ];
    targets TEXT[];
    existing TEXT[] := ARRAY[]::TEXT[];
    t TEXT;
BEGIN
    IF p_confirm IS DISTINCT FROM 'DELETE ALL DATA' THEN
        RAISE EXCEPTION 'Refusing to run. Call it as: CALL reset_test_data(''DELETE ALL DATA'');';
    END IF;

    targets := business_tables || CASE WHEN p_keep_setup THEN ARRAY[]::TEXT[] ELSE setup_tables END;

    FOREACH t IN ARRAY targets LOOP
        IF to_regclass(t) IS NOT NULL THEN
            existing := existing || t;
        ELSE
            RAISE NOTICE 'skip % (table not found)', t;
        END IF;
    END LOOP;

    -- One statement, no CASCADE: if any KEPT table (users, roles, settings, …)
    -- still referenced one of these rows, Postgres refuses and nothing is deleted.
    EXECUTE 'TRUNCATE TABLE ' ||
            (SELECT string_agg(format('%I', x), ', ') FROM unnest(existing) AS x) ||
            ' RESTART IDENTITY';

    IF p_keep_setup AND to_regclass('accounts') IS NOT NULL THEN
        UPDATE accounts SET balance = opening_balance, updated_at = now();
    END IF;

    RAISE NOTICE 'Cleared % tables. Kept % users and % roles.',
        array_length(existing, 1),
        (SELECT count(*) FROM users),
        (SELECT count(*) FROM roles);
END;
$$;
