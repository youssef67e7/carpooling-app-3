#!/usr/bin/env node
/**
 * Scans apps/mobile-legacy and generates:
 * - Flutter screen stubs under apps/mobile-flutter/lib/features/
 * - docs/FLUTTER_MIGRATION_REPORT.md
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RN_SRC = path.join(ROOT, "apps", "mobile-legacy", "src");
const FLUTTER_LIB = path.join(ROOT, "apps", "mobile-flutter", "lib");
const REPORT = path.join(ROOT, "docs", "FLUTTER_MIGRATION_REPORT.md");

/** RN path segment → Flutter feature folder */
const FEATURE_MAP = {
  screens: "features",
  "screens/more": "features/more",
  "screens/wallet": "features/wallet",
  components: "shared/widgets",
  hooks: "core/hooks",
  utils: "core/utils",
  store: "core/providers",
  navigation: "core/router",
  api: "core/api",
  realtime: "core/realtime",
  theme: "core/theme",
  constants: "core/constants",
  config: "core/config",
  context: "core/context",
  i18n: "core/i18n",
  animation: "core/animation",
};

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (["node_modules", ".expo"].includes(ent.name)) continue;
      walk(p, acc);
    } else if (/\.(js|jsx|json)$/.test(ent.name)) {
      acc.push(p);
    }
  }
  return acc;
}

function toSnakeCase(name) {
  return name
    .replace(/([A-Z])/g, "_$1")
    .replace(/^_/, "")
    .replace(/-/g, "_")
    .toLowerCase();
}

function toDartClass(name) {
  return name.replace(/Screen$/, "Screen").replace(/\.js$/, "");
}

function rnToDartPath(rnRel) {
  const base = path.basename(rnRel, path.extname(rnRel));
  const dir = path.dirname(rnRel).replace(/\\/g, "/");

  if (dir.startsWith("screens")) {
    const sub = dir.replace(/^screens\/?/, "");
    const featureDir = sub ? `features/${sub.replace(/\//g, "/")}` : "features/auth";
    const snake = toSnakeCase(base);
    return {
      dartRel: `${featureDir}/${snake}.dart`,
      className: base.replace(/Screen$/, "Screen"),
      kind: "screen",
    };
  }
  if (dir === "components" || dir.startsWith("components/")) {
    const sub = dir.replace(/^components\/?/, "");
    const snake = toSnakeCase(base);
    return {
      dartRel: `shared/widgets/${sub ? sub.replace(/\//g, "/") + "/" : ""}${snake}.dart`,
      className: base,
      kind: "widget",
    };
  }
  if (dir.startsWith("store/slices")) {
    return {
      dartRel: `core/providers/${toSnakeCase(base.replace(/Slice$/, "_provider"))}.dart`,
      className: `${base.replace(/Slice$/, "")}Provider`,
      kind: "provider",
    };
  }
  if (dir === "utils" || dir.startsWith("utils")) {
    return {
      dartRel: `core/utils/${toSnakeCase(base)}.dart`,
      className: base,
      kind: "util",
    };
  }
  if (dir === "hooks") {
    return {
      dartRel: `core/hooks/${toSnakeCase(base)}.dart`,
      className: base,
      kind: "hook",
    };
  }
  if (dir === "navigation") {
    return {
      dartRel: `core/router/${toSnakeCase(base)}.dart`,
      className: base,
      kind: "navigation",
    };
  }
  if (dir === "api") {
    return {
      dartRel: `core/api/${toSnakeCase(base)}.dart`,
      className: base,
      kind: "api",
    };
  }
  if (dir === "realtime") {
    return {
      dartRel: `core/realtime/${toSnakeCase(base)}.dart`,
      className: base,
      kind: "realtime",
    };
  }
  if (dir === "locales") {
    return {
      dartRel: `l10n/${base}`,
      className: base,
      kind: "locale",
    };
  }
  return {
    dartRel: `legacy_mirror/${dir}/${toSnakeCase(base)}.dart`,
    className: base,
    kind: "other",
  };
}

function screenStub(className, rnRel) {
  return `import 'package:flutter/material.dart';
import '../../../shared/widgets/weret_screen_scaffold.dart';

/// Migrated from React Native: ${rnRel.replace(/\\/g, "/")}
/// Status: generated stub — wire business logic from mobile-legacy reference.
class ${className} extends StatelessWidget {
  const ${className}({super.key});

  static const routeName = '${className}';

  @override
  Widget build(BuildContext context) {
    return WeretScreenScaffold(
      title: '${className.replace(/Screen$/, "")}',
      rnSource: '${rnRel.replace(/\\/g, "/")}',
      child: const Center(
        child: Text('${className} — migrated route preserved'),
      ),
    );
  }
}
`;
}

function widgetStub(className, rnRel) {
  return `import 'package:flutter/material.dart';

/// Migrated from React Native: ${rnRel.replace(/\\/g, "/")}
class ${className} extends StatelessWidget {
  const ${className}({super.key});

  @override
  Widget build(BuildContext context) {
    return const SizedBox.shrink(); // TODO: port UI from ${className}
  }
}
`;
}

function utilStub(className, rnRel) {
  return `// Migrated from React Native: ${rnRel.replace(/\\/g, "/")}
// TODO: port logic to Dart

class ${className} {
  const ${className}._();
}
`;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function main() {
  const rnFiles = walk(RN_SRC);
  const rows = [];
  let created = 0;
  let skipped = 0;

  for (const abs of rnFiles) {
    const rel = path.relative(RN_SRC, abs);
    const map = rnToDartPath(rel);
    const outAbs = path.join(FLUTTER_LIB, map.dartRel);

    if (map.kind === "locale") {
      ensureDir(outAbs);
      fs.copyFileSync(abs, outAbs);
      rows.push({ rn: rel, dart: map.dartRel, status: "copied", kind: map.kind });
      created++;
      continue;
    }

    if (fs.existsSync(outAbs)) {
      rows.push({ rn: rel, dart: map.dartRel, status: "exists", kind: map.kind });
      skipped++;
      continue;
    }

    ensureDir(outAbs);
    let content;
    if (map.kind === "screen") content = screenStub(map.className, rel);
    else if (map.kind === "widget") content = widgetStub(map.className, rel);
    else if (map.kind === "util") content = utilStub(map.className, rel);
    else {
      content = `// Migrated from React Native: ${rel.replace(/\\/g, "/")}\n// kind: ${map.kind}\n`;
    }
    fs.writeFileSync(outAbs, content, "utf8");
    rows.push({ rn: rel, dart: map.dartRel, status: "generated", kind: map.kind });
    created++;
  }

  const byKind = rows.reduce((a, r) => {
    a[r.kind] = (a[r.kind] || 0) + 1;
    return a;
  }, {});

  const md = `# Flutter Migration Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Count |
|--------|------:|
| React Native source files scanned | ${rnFiles.length} |
| Flutter artifacts created/updated | ${created} |
| Skipped (already present) | ${skipped} |

### By kind
${Object.entries(byKind)
  .map(([k, v]) => `- **${k}**: ${v}`)
  .join("\n")}

## Monorepo layout

\`\`\`
project-root/
├── apps/
│   ├── mobile-flutter/     ← new Flutter app
│   ├── mobile-legacy/      ← React Native reference (preserved)
│   └── web/                ← admin UI (from backend/admin-web)
├── backend/                ← Express API (unchanged location)
├── shared/                 ← constants + API contract
├── assets/                 ← shared images
├── docs/
└── backend/src/mongo/      ← MongoDB ODM + schema
\`\`\`

## React Native → Flutter file map

| RN file | Flutter file | Kind | Status |
|---------|--------------|------|--------|
${rows.map((r) => `| \`${r.rn}\` | \`${r.dart}\` | ${r.kind} | ${r.status} |`).join("\n")}

## Missing dependencies (install Flutter SDK first)

Run from \`apps/mobile-flutter\`:

\`\`\`bash
flutter pub get
\`\`\`

Required SDK: Flutter 3.24+ / Dart 3.5+

## Potential issues

1. **Flutter SDK not installed** on dev machine — run \`flutter doctor\` after install.
2. **WebRTC** requires platform-specific setup (\`flutter_webrtc\`).
3. **Google Sign-In** needs platform OAuth clients + \`.env\` / dart-define.
4. **Maps** — RN used \`react-native-maps\`; Flutter uses \`flutter_map\` + OSM tiles (no Google key required).
5. **Screen stubs** — generated screens preserve routes; full UI/logic ported incrementally from \`apps/mobile-legacy\`.
6. **MongoDB Atlas** — set \`MONGODB_URI\` in \`backend/.env\`; run \`npm run mongo:test-atlas\`.
7. **Root \`mobile/\` folder** may remain if locked by Metro; use \`apps/mobile-legacy\` as source of truth.

## Unresolved / manual follow-up

- [ ] Install Flutter SDK and run \`flutter analyze\`
- [ ] Port complex screens: \`PassengerHomeScreen\`, \`DriverHomeScreen\`, \`RideChatScreen\`, \`InAppCallScreen\`
- [ ] Wire Google Sign-In native config (Android/iOS)
- [ ] Push notifications (RN had local toggles only — no FCM yet)
- [ ] Delete or archive root \`mobile/\` after stopping Expo
`;

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, md, "utf8");
  console.log(`Report: ${REPORT}`);
  console.log(`RN files: ${rnFiles.length}, created: ${created}, skipped: ${skipped}`);
}

main();
