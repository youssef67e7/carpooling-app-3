import { createApp } from "../src/createApp.js";

const app = createApp();

export default async function handler(req, res) {
  return app(req, res);
}
