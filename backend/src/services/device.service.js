import jsonwebtoken from 'jsonwebtoken';
import crypto from 'node:crypto';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import config from '../config/index.js';
import userDeviceRepo from '../repositories/userDevice.repo.js';
import ApiError from '../utils/ApiError.js';

/*
 * Second sign-in step: after the password is accepted, the user must also unlock
 * with the device's own lock (Windows Hello PIN, phone PIN/biometric, Touch ID).
 * This is WebAuthn with a platform authenticator and user verification required.
 *
 * Between steps the server hands out a short-lived "device ticket": a JWT signed with a
 * key derived from the access secret, so it can never be accepted as an access token.
 */

const TICKET_TTL = '5m';
const ticketSecret = crypto.createHash('sha256').update(`${config.jwt.accessSecret}:device-ticket`).digest();
const EXPIRED = 'Device check expired. Please sign in again.';

const origins = () => (config.webauthn.origins.length ? config.webauthn.origins : config.cors.clientOrigin);
const rpId = () => config.webauthn.rpId || new URL(origins()[0]).hostname;

const signTicket = (claims) => jsonwebtoken.sign({ ...claims, purpose: 'device' }, ticketSecret, { expiresIn: TICKET_TTL });

/** Returns the ticket claims, or throws when it is invalid, expired or for another stage. */
export const readTicket = (ticket, stage) => {
  let payload;
  try {
    payload = jsonwebtoken.verify(String(ticket || ''), ticketSecret);
  } catch {
    throw ApiError.unauthorized(EXPIRED);
  }
  if (payload.purpose !== 'device' || payload.stage !== stage) throw ApiError.unauthorized(EXPIRED);
  return payload;
};

/*
 * Google Password Manager passkeys (published AAGUID). On Android they are unlocked with the
 * phone's own screen lock, which is what we want; on a laptop/desktop Chrome protects them with
 * a separate Google PIN instead of the computer's lock, so they are refused there and the user
 * is asked to set up Windows Hello (or Touch ID) instead.
 */
const GOOGLE_PASSWORD_MANAGER_AAGUID = 'ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4';
const isMobileAgent = (ua = '') => /Android|iPhone|iPad|iPod/i.test(String(ua));

const toStoredKey = (bytes) => Buffer.from(bytes).toString('base64url');
const fromStoredKey = (text) => new Uint8Array(Buffer.from(text, 'base64url'));
const splitTransports = (value) => (value ? value.split(',') : undefined);

/** "Chrome on Windows"-style label so admins can tell devices apart. */
export const describeDevice = (ua = '') => {
  const os = /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua)
      ? 'iPhone/iPad'
      : /Windows/i.test(ua)
        ? 'Windows'
        : /Mac OS X|Macintosh/i.test(ua)
          ? 'Mac'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Unknown OS';
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /OPR\//i.test(ua)
      ? 'Opera'
      : /Chrome\//i.test(ua)
        ? 'Chrome'
        : /Firefox\//i.test(ua)
          ? 'Firefox'
          : /Safari\//i.test(ua)
            ? 'Safari'
            : 'Browser';
  return `${browser} on ${os}`;
};

export const deviceService = {
  /** Ticket handed back by a successful password check. */
  passwordTicket(user) {
    return signTicket({ sub: String(user.user_id), stage: 'password' });
  },

  /**
   * WebAuthn options for this device: authentication when the browser presents a credential
   * this user already registered, otherwise registration (new devices enrol automatically
   * after a correct password). `anyKnownDevice` is the retry when the browser refused to
   * register because this device already holds one of the user's credentials but the
   * browser forgot which one (e.g. site data was cleared).
   */
  async options(claims, credentialId, user, { anyKnownDevice = false } = {}) {
    const sub = claims.sub;
    const known = credentialId ? await userDeviceRepo.findActiveByCredential(null, credentialId) : null;

    if (anyKnownDevice) {
      const devices = await userDeviceRepo.listActiveForUser(null, user.user_id);
      if (devices.length) {
        const options = await generateAuthenticationOptions({
          rpID: rpId(),
          allowCredentials: devices.map((d) => ({ id: d.credential_id, transports: splitTransports(d.transports) })),
          userVerification: 'required',
          timeout: 120000,
        });
        return {
          mode: 'authenticate',
          options,
          ticket: signTicket({ sub, stage: 'challenge', mode: 'authenticate', challenge: options.challenge }),
        };
      }
    }

    if (known && String(known.user_id) === sub) {
      const options = await generateAuthenticationOptions({
        rpID: rpId(),
        allowCredentials: [{ id: known.credential_id, transports: splitTransports(known.transports) }],
        userVerification: 'required',
        timeout: 120000,
      });
      return {
        mode: 'authenticate',
        options,
        ticket: signTicket({
          sub,
          stage: 'challenge',
          mode: 'authenticate',
          challenge: options.challenge,
          device_id: Number(known.device_id),
        }),
      };
    }

    const existing = await userDeviceRepo.listActiveForUser(null, user.user_id);
    const options = await generateRegistrationOptions({
      rpName: config.webauthn.rpName,
      rpID: rpId(),
      userName: user.username,
      userDisplayName: user.full_name || user.username,
      userID: new TextEncoder().encode(`user-${user.user_id}`),
      attestationType: 'none',
      excludeCredentials: existing.map((d) => ({ id: d.credential_id, transports: splitTransports(d.transports) })),
      // A device-bound (non-discoverable) key makes Chrome on Windows use Windows Hello — the
      // laptop's own PIN/fingerprint — instead of offering to create a Google Password Manager
      // passkey with a separate PIN. Phones still use their own fingerprint / PIN.
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged',
        requireResidentKey: false,
      },
      preferredAuthenticatorType: 'localDevice',
      timeout: 120000,
    });
    return {
      mode: 'register',
      options,
      ticket: signTicket({ sub, stage: 'challenge', mode: 'register', challenge: options.challenge }),
    };
  },

  /** Verifies the device's WebAuthn response. Returns { deviceId, credentialId, registered }. */
  async verify(claims, response, user, userAgent) {
    if (claims.mode === 'register') {
      let result;
      try {
        result = await verifyRegistrationResponse({
          response,
          expectedChallenge: claims.challenge,
          expectedOrigin: origins(),
          expectedRPID: rpId(),
          requireUserVerification: true,
        });
      } catch (err) {
        throw ApiError.unauthorized(`Device verification failed: ${err.message}`);
      }
      if (!result.verified) throw ApiError.unauthorized('Device verification failed');
      if (result.registrationInfo.aaguid === GOOGLE_PASSWORD_MANAGER_AAGUID && !isMobileAgent(userAgent)) {
        throw ApiError.badRequest(
          "This computer saved the key in Google Password Manager, which uses a separate Google PIN. Set up Windows Hello (Settings → Accounts → Sign-in options → PIN) so the laptop's own PIN is used, then sign in again."
        );
      }
      const { credential } = result.registrationInfo;
      const deviceId = await userDeviceRepo.create(null, {
        user_id: user.user_id,
        credential_id: credential.id,
        public_key: toStoredKey(credential.publicKey),
        sign_count: credential.counter,
        transports: credential.transports?.join(',') || null,
        device_name: describeDevice(userAgent),
        user_agent: userAgent ? String(userAgent).slice(0, 500) : null,
      });
      return { deviceId, credentialId: credential.id, registered: true };
    }

    const device = await userDeviceRepo.findActiveByCredential(null, response?.id);
    const wrongDevice = claims.device_id != null && Number(device?.device_id) !== Number(claims.device_id);
    if (!device || wrongDevice || String(device.user_id) !== claims.sub) {
      throw ApiError.unauthorized('This device is not registered for your account');
    }
    let result;
    try {
      result = await verifyAuthenticationResponse({
        response,
        expectedChallenge: claims.challenge,
        expectedOrigin: origins(),
        expectedRPID: rpId(),
        requireUserVerification: true,
        credential: {
          id: device.credential_id,
          publicKey: fromStoredKey(device.public_key),
          counter: Number(device.sign_count),
          transports: splitTransports(device.transports),
        },
      });
    } catch (err) {
      throw ApiError.unauthorized(`Device verification failed: ${err.message}`);
    }
    if (!result.verified) throw ApiError.unauthorized('Device verification failed');
    await userDeviceRepo.markUsed(null, device.device_id, result.authenticationInfo.newCounter);
    return { deviceId: device.device_id, credentialId: device.credential_id, registered: false };
  },

  async listForUser(userId) {
    const rows = await userDeviceRepo.listActiveForUser(null, userId);
    return rows.map(({ device_id, device_name, created_at, last_used_at }) => ({
      device_id,
      device_name,
      created_at,
      last_used_at,
    }));
  },

  async revoke(userId, deviceId) {
    const n = await userDeviceRepo.revoke(null, userId, deviceId);
    if (!n) throw ApiError.notFound('Device not found');
  },
};

export default deviceService;
