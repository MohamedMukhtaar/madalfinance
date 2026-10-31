import { authApi as http } from "../api";
import type { User } from "@/types";
import { unwrap, withUserAvatar, toSnakeCase, uploadFile, type PasswordStep, type LoginResult, type DeviceOptionsResult } from "./helpers";

export const authApi = {
  /* ------------------------------ AUTH ------------------------------ */
  async login(username: string, password: string): Promise<PasswordStep> {
    const res = await http.post<PasswordStep>("/auth/login", { username, password });
    return unwrap(res);
  },

  async deviceOptions(
    deviceTicket: string,
    credentialId?: string | null,
    anyKnownDevice = false
  ): Promise<DeviceOptionsResult> {
    // WebAuthn option names have no underscores, so the camelCase response normalizer leaves them intact.
    const res = await http.post<DeviceOptionsResult>("/auth/device/options", {
      device_ticket: deviceTicket,
      credential_id: credentialId ?? null,
      any_known_device: anyKnownDevice,
    });
    return unwrap(res);
  },

  async deviceVerify(deviceTicket: string, response: unknown): Promise<LoginResult> {
    const res = await http.post<LoginResult>("/auth/device/verify", { device_ticket: deviceTicket, response });
    const result = unwrap(res);
    return { ...result, user: withUserAvatar(result.user) };
  },

  async me(): Promise<User> {
    const res = await http.get<{ user: User }>("/auth/me");
    return withUserAvatar(unwrap(res).user);
  },

  async unlock(password: string): Promise<void> {
    await http.post("/auth/unlock", { password });
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      await http.post("/auth/logout", { refresh_token: refreshToken });
    } catch {
      /* revoke failure should never block local sign-out */
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await http.put("/auth/me/password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  async changeUsername(currentPassword: string, newUsername: string): Promise<void> {
    await http.put("/auth/me/username", {
      current_password: currentPassword,
      new_username: newUsername,
    });
  },

  async updateProfile(patch: {
    fullName?: string;
    phone?: string;
    email?: string;
  }): Promise<User> {
    const res = await http.put<{ user: User }>("/auth/me/profile", toSnakeCase(patch));
    return withUserAvatar(unwrap(res).user);
  },

  async uploadMyAvatar(file: File, onProgress?: (p: number) => void): Promise<User> {
    const user = await uploadFile<User>("/auth/me/avatar", file, onProgress);
    return withUserAvatar(user);
  },

  async removeMyAvatar(): Promise<User> {
    const res = await http.delete<User>("/auth/me/avatar");
    return withUserAvatar(unwrap(res));
  },

};
