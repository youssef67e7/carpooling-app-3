import { createApp } from "../src/createApp.js";

const app = createApp();

// Force rebuild v4
export default async function handler(req, res) {
  return app(req, res);
}
