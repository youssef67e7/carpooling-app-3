import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "http";
import { connectMongo, closeMongo } from "../src/mongo/client.js";
import { createApp } from "../src/createApp.js";

const ENV_KEYS = ["MONGODB_URI", "JWT_SECRET", "NODE_ENV"];

async function post(base, path, json, token) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(json) });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

describe("auth flows integration", () => {
  const saved = {};
  let server;
  let base;

  before(async () => {
    for (const k of ENV_KEYS) saved[k] = process.env[k];
    process.env.MONGODB_URI = "memory";
    process.env.JWT_SECRET = "test-jwt-secret";
    process.env.NODE_ENV = "test";
    await connectMongo();
    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve) => server?.close(resolve));
    await closeMongo();
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("passenger register + login", async () => {
    const email = `passenger_${Date.now()}@test.local`;
    const reg = await post(base, "/auth/register", {
      name: "Test Passenger",
      email,
      password: "secret12",
    });
    assert.equal(reg.status, 201);
    assert.ok(reg.body.token);
    assert.equal(reg.body.user.email, email);

    const login = await post(base, "/auth/login", { email, password: "secret12" });
    assert.equal(login.status, 200);
    assert.ok(login.body.token);
  });

  it("forgot password + reset password", async () => {
    const email = `reset_${Date.now()}@test.local`;
    const reg = await post(base, "/auth/register", {
      name: "Reset User",
      email,
      password: "oldpass1",
    });
    assert.equal(reg.status, 201);

    const forgot = await post(base, "/auth/forgot-password", { email });
    assert.equal(forgot.status, 200);
    assert.ok(forgot.body._devOtp);

    const reset = await post(base, "/auth/reset-password", {
      email,
      otp: forgot.body._devOtp,
      password: "newpass1",
    });
    assert.equal(reset.status, 200);

    const oldLogin = await post(base, "/auth/login", { email, password: "oldpass1" });
    assert.equal(oldLogin.status, 401);

    const newLogin = await post(base, "/auth/login", { email, password: "newpass1" });
    assert.equal(newLogin.status, 200);
  });

  it("phone register rejects duplicate", async () => {
    const phone = "+201099988877";
    const otpReq = await post(base, "/auth/phone/otp", { phone, forRegister: true });
    assert.equal(otpReq.status, 200);
    assert.ok(otpReq.body._devOtp);

    const verify = await post(base, "/auth/phone/verify", {
      phone,
      otp: otpReq.body._devOtp,
      name: "Phone User",
    });
    assert.equal(verify.status, 200);
    assert.ok(verify.body.token);

    const dup = await post(base, "/auth/phone/otp", { phone, forRegister: true });
    assert.equal(dup.status, 409);
  });
});
