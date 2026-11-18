#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { execSync } from "child_process";
import { downloadFile, extractArchive, getArchiveMetadata, getLatestReleaseTag } from "./release.js";
import { setUpNewSite } from "./setup.js";

// The tests, and CI's Starter site job, import these from here.
export { buildExtractCommand, getArchiveMetadata, tagFromReleaseUrl } from "./release.js";
export {
  applyStarterConfig,
  patchPackageJson,
  patchSiteConfig,
  patchSiteConfigSource,
  removeEngineFiles,
  removeLocaleTrees,
  setUpNewSite,
  toSitePackage,
} from "./setup.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function prompt(question: string, defaultVal: string = ""): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const display = defaultVal ? `${question} (${defaultVal}): ` : `${question}: `;
  return new Promise((resolve) => {
    rl.question(display, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultVal);
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("\nCreate Amytis — scaffold a new digital garden\n");

  // 1. Project name
  let projectName = process.argv[2] ?? "";
  if (!projectName) {
    projectName = await prompt("Project name", "my-blog");
  }

  const targetDir = path.resolve(process.cwd(), projectName);
  if (fs.existsSync(targetDir)) {
    console.error(`Error: directory "${projectName}" already exists.`);
    process.exit(1);
  }

  // 2. Find the latest release
  console.log("\nFetching latest Amytis release...");
  const tag = await getLatestReleaseTag();
  console.log(`  Found: ${tag}`);

  // 3. Download tarball
  const archive = getArchiveMetadata(tag);
  const archiveDest = path.join(process.cwd(), archive.filename);
  console.log("Downloading tarball...");
  await downloadFile(archive.url, archiveDest);

  // 4. Extract
  console.log("Extracting...");
  extractArchive(archiveDest, targetDir, archive.kind);
  console.log(`  Scaffolded: ${targetDir}`);

  // 5-6. Prompt for site metadata
  const siteTitle = await prompt("\nSite title", projectName);
  const siteDescription = await prompt(
    "Site description",
    "My digital garden"
  );

  // 7. Start from the starter config, remove what only the Amytis repo uses,
  // and patch site.config.ts and package.json
  console.log("\nSetting up the site...");
  const setup = setUpNewSite(targetDir, { projectName, title: siteTitle, description: siteDescription });
  if (!setup.starter) {
    console.warn("  Warning: site.config.example.ts not found, keeping the release's site.config.ts");
  }
  if (setup.localeTrees.length > 0) {
    console.log(`  Removed the demo's translations: ${setup.localeTrees.join(", ")}`);
  }
  if (setup.engineFiles.length > 0) {
    console.log(`  Removed the Amytis repo's own tests and CI: ${setup.engineFiles.join(", ")}`);
  }

  // 8. Run bun install
  console.log("Installing dependencies (bun install)...");
  execSync("bun install", { cwd: targetDir, stdio: "inherit" });

  // 9. Success message
  console.log(`
Done! Your new Amytis site is ready.

  cd ${projectName}
  bun dev          # start the dev server at http://localhost:3000
  bun run build    # production build

Edit site.config.ts to customise navigation, themes, and more.
Happy gardening!
`);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("\nError:", (err as Error).message);
    process.exit(1);
  });
}
