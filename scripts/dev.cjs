/** Backend + Flutter dev — React Native removed */
const { spawn } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const backend = spawn("npm run dev", { cwd: path.join(root, "backend"), shell: true, stdio: "inherit" });
console.log("\nBackend running. Start Flutter separately:\n  cd apps/mobile-flutter && flutter run\n");

process.on("SIGINT", () => { backend.kill(); process.exit(0); });
