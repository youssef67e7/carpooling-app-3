import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildLoginOtpMessage } from "../src/services/sendSms.js";

describe("sendSms helpers", () => {
  it("buildLoginOtpMessage includes otp", () => {
    const msg = buildLoginOtpMessage("482910");
    assert.match(msg, /482910/);
  });
});
