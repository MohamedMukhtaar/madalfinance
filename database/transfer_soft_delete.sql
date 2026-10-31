-- Transfers can be deleted (reversed). Keep the row for history, marked as deleted.

ALTER TABLE account_transfers
    ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delete_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS deleted_by    BIGINT REFERENCES users(user_id);

CREATE INDEX IF NOT EXISTS idx_account_transfers_deleted ON account_transfers (deleted_at);
