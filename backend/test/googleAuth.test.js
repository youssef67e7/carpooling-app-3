import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getGoogleOAuthAudiences,
  isGoogleAuthConfigured,
  verifyGoogleIdToken,
} from "../src/utils/verifyGoogleIdToken.js";

const ENV_KEYS = [
  "GOOGLE_OAUTH_WEB_CLIENT_ID",
  "GOOGLE_OAUTH_IOS_CLIENT_ID",
  "GOOGLE_OAUTH_ANDROID_CLIENT_ID",
  "GOOGLE_OAUTH_EXPO_CLIENT_ID",
];

describe("google auth config", () => {
  const saved = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("isGoogleAuthConfigured false when env empty", () => {
    assert.equal(isGoogleAuthConfigured(), false);
    assert.deepEqual(getGoogleOAuthAudiences(), []);
  });

  it("isGoogleAuthConfigured true when web client set", () => {
    process.env.GOOGLE_OAUTH_WEB_CLIENT_ID = "abc.apps.googleusercontent.com";
    assert.equal(isGoogleAuthConfigured(), true);
    assert.deepEqual(getGoogleOAuthAudiences(), ["abc.apps.googleusercontent.com"]);
  });

  it("verifyGoogleIdToken throws GOOGLE_NOT_CONFIGURED without env", async () => {
    await assert.rejects(() => verifyGoogleIdToken("fake"), (err) => {
      assert.equal(err.code, "GOOGLE_NOT_CONFIGURED");
      return true;
    });
  });
});
