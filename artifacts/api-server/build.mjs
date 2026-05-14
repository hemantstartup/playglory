import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, mkdir, copyFile, writeFile } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

const EXTERNALS = [
  "*.node","sharp","better-sqlite3","sqlite3","canvas","bcrypt","argon2",
  "fsevents","re2","farmhash","xxhash-addon","bufferutil","utf-8-validate",
  "ssh2","cpu-features","dtrace-provider","isolated-vm","lightningcss",
  "pg-native","oracledb","mongodb-client-encryption","nodemailer","handlebars",
  "knex","typeorm","protobufjs","onnxruntime-node","@tensorflow/*",
  "@prisma/client","@mikro-orm/*","@grpc/*","@swc/*","@aws-sdk/*","@azure/*",
  "@opentelemetry/*","@google-cloud/*","@google/*","googleapis","firebase-admin",
  "@parcel/watcher","@sentry/profiling-node","@tree-sitter/*","aws-sdk",
  "classic-level","dd-trace","ffi-napi","grpc","hiredis","kerberos","leveldown",
  "miniflare","mysql2","newrelic","odbc","piscina","realm","ref-napi","rocksdb",
  "sass-embedded","sequelize","serialport","snappy","tinypool","usb","workerd",
  "wrangler","zeromq","zeromq-prebuilt","playwright","puppeteer","puppeteer-core",
  "electron",
];

const BANNER = {
  js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';
globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
  `,
};

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  // Main server bundle (Replit / self-hosted)
  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    external: EXTERNALS,
    sourcemap: "linked",
    plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
    banner: BANNER,
  });

  // Vercel serverless bundle — CJS, self-contained
  const handlerOut = path.resolve(artifactDir, "api/handler.js");
  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/vercel-handler.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: handlerOut,
    logLevel: "info",
    external: [...EXTERNALS, "pino-pretty", "thread-stream"],
  });

  // --- Vercel Build Output API v3 ---
  // Creating .vercel/output tells Vercel exactly what to deploy,
  // bypassing framework detection and outputDirectory issues entirely.
  const vercelOut = path.resolve(artifactDir, ".vercel/output");
  const funcDir = path.resolve(vercelOut, "functions/api/handler.func");
  await rm(vercelOut, { recursive: true, force: true });
  await mkdir(funcDir, { recursive: true });

  // Copy the bundled handler into the function directory
  await copyFile(handlerOut, path.resolve(funcDir, "index.js"));

  // Function runtime config
  await writeFile(
    path.resolve(funcDir, ".vc-config.json"),
    JSON.stringify({
      runtime: "nodejs18.x",
      handler: "index.js",
      launcherType: "Nodejs",
      shouldAddHelpers: true,
    }, null, 2)
  );

  // Global output config: CORS headers on every response + route all to handler
  await writeFile(
    path.resolve(vercelOut, "config.json"),
    JSON.stringify({
      version: 3,
      routes: [
        {
          src: "/(.*)",
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
          },
          continue: true,
        },
        {
          src: "/(.*)",
          dest: "/api/handler",
        },
      ],
    }, null, 2)
  );

  console.log("Vercel Build Output written to .vercel/output/");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
