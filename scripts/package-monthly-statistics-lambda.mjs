import { execFileSync } from "node:child_process";
import {
  cp,
  mkdir,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const buildDirectory = path.join(
  projectDirectory,
  ".lambda-build",
  "monthly-statistics",
);
const zipPath = path.join(
  projectDirectory,
  "monthly-statistics-lambda.zip",
);

await rm(buildDirectory, { recursive: true, force: true });
await rm(zipPath, { force: true });
await mkdir(buildDirectory, { recursive: true });

await build({
  entryPoints: [
    path.join(
      projectDirectory,
      "src",
      "lambda",
      "monthlyStatisticsHandler.ts",
    ),
  ],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: path.join(buildDirectory, "index.js"),
  external: ["@prisma/client"],
});

const nodeModulesDirectory = path.join(buildDirectory, "node_modules");
await mkdir(path.join(nodeModulesDirectory, "@prisma"), { recursive: true });
await mkdir(path.join(nodeModulesDirectory, ".prisma"), { recursive: true });

await cp(
  path.join(projectDirectory, "node_modules", "@prisma", "client"),
  path.join(nodeModulesDirectory, "@prisma", "client"),
  { recursive: true },
);
await cp(
  path.join(projectDirectory, "node_modules", ".prisma", "client"),
  path.join(nodeModulesDirectory, ".prisma", "client"),
  { recursive: true },
);

const generatedClientDirectory = path.join(
  nodeModulesDirectory,
  ".prisma",
  "client",
);
const generatedClientFiles = await readdir(generatedClientDirectory);

await Promise.all(
  generatedClientFiles
    .filter(
      (fileName) =>
        fileName.includes("darwin") ||
        fileName.endsWith(".wasm") ||
        fileName.startsWith("wasm"),
    )
    .map((fileName) =>
      rm(path.join(generatedClientDirectory, fileName), {
        recursive: true,
        force: true,
      }),
    ),
);

execFileSync("zip", ["-q", "-r", zipPath, "."], {
  cwd: buildDirectory,
});

const zipStats = await stat(zipPath);
const zipSizeMb = (zipStats.size / 1024 / 1024).toFixed(2);

console.info("Lambda package created", {
  path: zipPath,
  sizeMb: zipSizeMb,
  handler: "index.handler",
});
