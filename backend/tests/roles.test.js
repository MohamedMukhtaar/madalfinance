import test from "node:test";
import assert from "node:assert/strict";
import { ROLES, APP_ACCESS, TRASH_ACCESS, MANAGE_ROLES, SETTINGS_WRITE, USER_MANAGEMENT } from "../src/utils/constants.js";

test("only Super Admin and Admin roles exist", () => {
  assert.equal(ROLES.SUPER_ADMIN, "Super Admin");
  assert.equal(ROLES.ADMIN, "Admin");
});

test("trash is super-admin only", () => {
  assert.deepEqual(TRASH_ACCESS, [ROLES.SUPER_ADMIN]);
  assert.ok(!TRASH_ACCESS.includes(ROLES.ADMIN));
});

test("app access includes both roles", () => {
  assert.deepEqual(APP_ACCESS, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
  assert.deepEqual(MANAGE_ROLES, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
});

test("settings write is super-admin only", () => {
  assert.deepEqual(SETTINGS_WRITE, [ROLES.SUPER_ADMIN]);
});

test("user management is super-admin only", () => {
  assert.deepEqual(USER_MANAGEMENT, [ROLES.SUPER_ADMIN]);
});
