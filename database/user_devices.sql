-- Devices (WebAuthn platform credentials) each user has verified with the device's own
-- lock: Windows Hello PIN/fingerprint, phone PIN/Face ID, Mac Touch ID, …

CREATE TABLE IF NOT EXISTS user_devices (
    device_id      BIGSERIAL PRIMARY KEY,
    user_id        BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    credential_id  VARCHAR(512) NOT NULL UNIQUE,
    public_key     TEXT NOT NULL,
    sign_count     BIGINT NOT NULL DEFAULT 0,
    transports     VARCHAR(255),
    device_name    VARCHAR(150),
    user_agent     VARCHAR(500),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at   TIMESTAMPTZ,
    revoked_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
