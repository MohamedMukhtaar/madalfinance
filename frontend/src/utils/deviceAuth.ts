import {
  WebAuthnError,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { financeService, type DeviceOptionsResult, type PasswordStep } from "@/services/finance";

/*
 * Sign-in step 2: confirm with the device's own lock (Windows Hello PIN / fingerprint,
 * phone PIN / Face ID, Mac Touch ID) using WebAuthn.
 */

const credentialKey = (userId: number) => `madal_device_credential:${userId}`;

function readCredential(userId: number): string | null {
  try {
    return localStorage.getItem(credentialKey(userId));
  } catch {
    return null;
  }
}

function writeCredential(userId: number, id: string | null) {
  try {
    if (id) localStorage.setItem(credentialKey(userId), id);
    else localStorage.removeItem(credentialKey(userId));
  } catch {
    /* next sign-in simply falls back to the any-known-device check */
  }
}

/** Throws a user-facing error when this browser/device cannot do the device check. */
export async function assertDeviceLockAvailable(): Promise<void> {
  if (!window.isSecureContext) {
    throw new Error("Device verification needs a secure (HTTPS) connection. Open the system using its https:// address.");
  }
  if (!browserSupportsWebAuthn()) {
    throw new Error("This browser can't verify your device. Update it or use Chrome, Edge, Safari or Firefox.");
  }
  if (!(await platformAuthenticatorIsAvailable())) {
    throw new Error(
      "This device has no screen lock set up. Set a PIN, fingerprint or face unlock (Windows Hello on Windows), then sign in again."
    );
  }
}

const isCode = (err: unknown, ...codes: string[]) => err instanceof WebAuthnError && codes.includes(err.code);
const isName = (err: unknown, ...names: string[]) => err instanceof Error && names.includes(err.name);

function friendly(err: unknown): Error {
  if (isName(err, "NotAllowedError") || isCode(err, "ERROR_CEREMONY_ABORTED")) {
    return new Error("Device check was cancelled or timed out. Sign in again and confirm with your device PIN, fingerprint or face.");
  }
  if (isCode(err, "ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT")) {
    return new Error("This device can't confirm it's you. Set a PIN, fingerprint or face unlock on it first.");
  }
  if (isCode(err, "ERROR_INVALID_DOMAIN", "ERROR_INVALID_RP_ID")) {
    return new Error("Device verification isn't configured for this address. Contact your administrator.");
  }
  return err instanceof Error ? err : new Error("Device verification failed");
}

async function runCeremony(opts: DeviceOptionsResult) {
  if (opts.mode === "register") {
    return startRegistration({ optionsJSON: opts.options as unknown as Parameters<typeof startRegistration>[0]["optionsJSON"] });
  }
  return startAuthentication({ optionsJSON: opts.options as unknown as Parameters<typeof startAuthentication>[0]["optionsJSON"] });
}

/** Runs the device check after a correct password and returns the finished login (tokens + user). */
export async function verifyThisDevice(step: PasswordStep) {
  const stored = readCredential(step.userId);
  let opts = await financeService.deviceOptions(step.deviceTicket, stored);

  let response;
  try {
    response = await runCeremony(opts);
  } catch (err) {
    if (opts.mode === "register" && (isCode(err, "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") || isName(err, "InvalidStateError"))) {
      // Already registered on this device, but the browser forgot which credential — sign in with it instead.
      opts = await financeService.deviceOptions(step.deviceTicket, null, true);
      try {
        response = await runCeremony(opts);
      } catch (retryErr) {
        throw friendly(retryErr);
      }
    } else {
      // A stale remembered credential (e.g. removed from the device) must not block the next attempt.
      if (opts.mode === "authenticate") writeCredential(step.userId, null);
      throw friendly(err);
    }
  }

  const result = await financeService.deviceVerify(opts.ticket, response);
  writeCredential(step.userId, result.credentialId ?? null);
  return result;
}
