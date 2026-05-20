import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizePhone,
  hashPhoneOtp,
  randomPhoneOtp6,
  syntheticEmailForPhone,
} from "../src/utils/phoneOtp.js";

describe("phoneOtp utils", () => {
  it("normalizePhone accepts Egypt 01xxxxxxxx", () => {
    assert.equal(normalizePhone("01012345678"), "+201012345678");
  });

  it("normalizePhone accepts Saudi 05xxxxxxxx", () => {
    assert.equal(normalizePhone("0501234567"), "+966501234567");
  });

  it("normalizePhone keeps E.164", () => {
    assert.equal(normalizePhone("+966501234567"), "+966501234567");
  });

  it("normalizePhone rejects too short", () => {
    assert.equal(normalizePhone("123"), "");
  });

  it("hashPhoneOtp is deterministic", () => {
    assert.equal(hashPhoneOtp("123456"), hashPhoneOtp("123456"));
    assert.notEqual(hashPhoneOtp("123456"), hashPhoneOtp("654321"));
  });

  it("randomPhoneOtp6 returns 6 digits", () => {
    const otp = randomPhoneOtp6();
    assert.match(otp, /^[0-9]{6}$/);
  });

  it("syntheticEmailForPhone is stable", () => {
    assert.equal(syntheticEmailForPhone("+201012345678"), "phone_201012345678@weret.local");
  });
});
