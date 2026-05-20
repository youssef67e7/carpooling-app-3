import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeAdminEmail, isFixedAdminEmail } from "../src/config/fixedAdmins.js";

describe("fixed admins", () => {
  it("normalizeAdminEmail lowercases and trims", () => {
    assert.equal(normalizeAdminEmail("  YouSsef@Gmail.COM "), "youssef@gmail.com");
  });

  it("isFixedAdminEmail recognizes allowed admins", () => {
    assert.equal(isFixedAdminEmail("youssef@gmail.com"), true);
    assert.equal(isFixedAdminEmail("other@test.com"), false);
  });
});
