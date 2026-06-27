import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashEmailOtp, randomEmailOtp6 } from "../src/utils/emailOtp.js";

process.env.EMAIL_OTP_SECRET = "test-secret";

describe("emailOtp utils", () => {
  it("hashEmailOtp is deterministic", () => {
    assert.equal(hashEmailOtp("123456"), hashEmailOtp("123456"));
    assert.notEqual(hashEmailOtp("123456"), hashEmailOtp("654321"));
  });

  it("randomEmailOtp6 returns 6 digits", () => {
    const otp = randomEmailOtp6();
    assert.match(otp, /^[0-9]{6}$/);
  });
});
