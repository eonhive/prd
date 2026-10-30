/**
 * Company: EonHive
 * Title: Release Smoke Script
 * Purpose: Validate publishable PRD packages from packed tarballs in clean temp projects before npm release.
 * Author: Stan Nesi
 * Created: 2026-04-10
 * Updated: 2026-10-30
 * Notes: Vibe coded with Codex.
 */

import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { publicReleasePackages } from "./release-packages.mjs";
import { runExternalConsumerSmoke } from "./external-consumer-smoke.mjs";

const repoRoot = process.cwd();
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const tarCommand = process.platform === "win32" ? "tar.exe" : "tar";

export const publishablePackages = publicReleasePackages;

const concreteInternalDependencyRangePattern =
  /^(?:[\^~])?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function runCommand(command, args, options = {}) {
  const {
    cwd = repoRoot,
    capture = false,
    env
  } = options;

  return new Promise((resolvePromise, reject) => {
    const stdout = [];
    const stderr = [];
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        ...env
      },
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit"
    });

    if (capture) {
      child.stdout?.on("data", (chunk) => {
        stdout.push(String(chunk));
      });
      child.stderr?.on("data", (chunk) => {
        stderr.push(String(chunk));
      });
    }

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise({
          stdout: stdout.join(""),
          stderr: stderr.join("")
        });
        return;
      }

      reject(
        new Error(
          signal == null
            ? `Command failed: ${command} ${args.join(" ")} (exit ${code ?? "unknown"})`
            : `Command failed: ${command} ${args.join(" ")} (signal ${signal})`
        )
      );
    });
  });
}

function collectDependencyEntries(manifest) {
  return [
    ...Object.entries(manifest.dependencies ?? {}).map(([name, value]) => ({
      field: "dependencies",
      name,
      value
    })),
    ...Object.entries(manifest.optionalDependencies ?? {}).map(([name, value]) => ({
      field: "optionalDependencies",
      name,
      value
    }))
  ];
}

export function assertPackedManifestDependencyMetadata(packageName, manifest) {
  const dependencyEntries = collectDependencyEntries(manifest);
  const workspaceDependencies = dependencyEntries.filter(({ value }) =>
    String(value).startsWith("workspace:")
  );

  if (workspaceDependencies.length > 0) {
    throw new Error(
      `${packageName} packed manifest still contains workspace protocol dependencies: ${workspaceDependencies
        .map(({ field, name, value }) => `${field}.${name}=${value}`)
        .join(", ")}`
    );
  }

  const invalidInternalDependencyRanges = dependencyEntries.filter(
    ({ name, value }) =>
      name.startsWith("@eonhive/prd-") &&
      !concreteInternalDependencyRangePattern.test(String(value))
  );

  if (invalidInternalDependencyRanges.length > 0) {
    throw new Error(
      `${packageName} packed manifest contains non-semver internal dependency ranges: ${invalidInternalDependencyRanges
        .map(({ field, name, value }) => `${field}.${name}=${value}`)
        .join(", ")}`
    );
  }
}

function packageTarballPath(output, tarballDir) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const tarballLine = [...lines]
    .reverse()
    .find((line) => line.endsWith(".tgz"));

  if (!tarballLine) {
    throw new Error("Could not determine tarball name from `pnpm pack` output.");
  }

  return isAbsolute(tarballLine) ? tarballLine : join(tarballDir, tarballLine);
}

async function packPublishablePackages(tarballDir) {
  const tarballs = {};

  for (const pkg of publishablePackages) {
    const { stdout } = await runCommand(
      pnpmCommand,
      ["pack", "--pack-destination", tarballDir],
      {
        cwd: join(repoRoot, pkg.directory),
        capture: true
      }
    );

    tarballs[pkg.name] = packageTarballPath(stdout, tarballDir);
  }

  return tarballs;
}

async function readPackedPackageManifest(tarballPath) {
  const { stdout } = await runCommand(
    tarCommand,
    ["-xOf", tarballPath, "package/package.json"],
    {
      capture: true
    }
  );

  return JSON.parse(stdout);
}

async function assertTarballManifestMetadata(tarballs) {
  for (const pkg of publishablePackages) {
    const manifest = await readPackedPackageManifest(tarballs[pkg.name]);
    assertPackedManifestDependencyMetadata(pkg.name, manifest);
  }
}

async function installSmokeProject(projectDir, tarballPaths, npmCacheDir) {
  await mkdir(projectDir, { recursive: true });
  await writeFile(
    join(projectDir, "package.json"),
    JSON.stringify(
      {
        name: "prd-release-smoke",
        private: true,
        type: "module"
      },
      null,
      2
    )
  );

  await runCommand(
    npmCommand,
    ["install", "--no-audit", "--no-fund", ...tarballPaths],
    {
      cwd: projectDir,
      env: {
        npm_config_cache: npmCacheDir
      }
    }
  );
}

async function writeAndRunNodeCheck(projectDir, fileName, source) {
  const checkPath = join(projectDir, fileName);
  const header = [
    "/**",
    " * Company: EonHive Inc. | Title: PRD Package Smoke Check",
    " * Purpose: Verify installed package behavior in a disposable consumer project.",
    " * Author: Stan Nesi | Created: 2026-10-27 | Updated: 2026-10-27",
    " * Notes: Vibe coded with Codex.",
    " */",
    ""
  ].join("\n");
  await writeFile(checkPath, header + source);
  await runCommand(process.execPath, [checkPath], { cwd: projectDir });
}

export async function runReleaseSmoke() {
  const scratchRoot = await mkdtemp(join(tmpdir(), "prd-release-smoke-"));
  const tarballDir = join(scratchRoot, "tarballs");
  const npmCacheDir = join(scratchRoot, "npm-cache");
  const exampleDocumentPath = resolve(repoRoot, "examples/document-basic");

  try {
    await mkdir(tarballDir, { recursive: true });
    await mkdir(npmCacheDir, { recursive: true });

    const tarballs = await packPublishablePackages(tarballDir);
    await assertTarballManifestMetadata(tarballs);
    const consumer = await runExternalConsumerSmoke({
      repoRoot,
      packageSpecs: publicReleasePackages.map(pkg => tarballs[pkg.name]),
      summaryPath: "examples/dist/tarball-consumer-smoke-summary.json"
    });
    if (consumer.status !== "passed") throw new Error("The published-consumer workflow failed against local tarballs.");

    const typesProjectDir = join(scratchRoot, "types-project");
    await installSmokeProject(typesProjectDir, [tarballs["@eonhive/prd-types"]], npmCacheDir);
    await writeAndRunNodeCheck(
      typesProjectDir,
      "check-types.mjs",
      [
        'import { normalizeProfileId } from "@eonhive/prd-types";',
        'const result = normalizeProfileId("general-document");',
        'if (result.normalized !== "general-document") {',
        '  throw new Error("Failed to import @eonhive/prd-types from tarball.");',
        '}'
      ].join("\n")
    );

    const validatorProjectDir = join(scratchRoot, "validator-project");
    await installSmokeProject(validatorProjectDir, [
      tarballs["@eonhive/prd-types"],
      tarballs["@eonhive/prd-validator"]
    ], npmCacheDir);
    await writeAndRunNodeCheck(
      validatorProjectDir,
      "check-validator.mjs",
      [
        'import { validateManifestObject } from "@eonhive/prd-validator";',
        'import { validatePackageDirectory, readPackageDirectory } from "@eonhive/prd-validator/node";',
        'import { readPrdContainer, createPrdContainer } from "@eonhive/prd-validator/container";',
        'const emptyZip = new Uint8Array([80,75,5,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);',
        'if (readPrdContainer(createPrdContainer(emptyZip)).kind !== "prd") throw new Error("Container export failed in tarball smoke.");',
        `const result = validateManifestObject(${JSON.stringify({
          prdVersion: "1.0",
          manifestVersion: "1.0",
          id: "urn:test:release-smoke",
          profile: "general-document",
          title: "Release Smoke",
          entry: "content/root.json"
        })});`,
        'if (!result.valid) {',
        '  throw new Error("Manifest validation failed in tarball smoke test.");',
        '}',
        `const packageResult = await validatePackageDirectory(${JSON.stringify(exampleDocumentPath)});`,
        'if (!packageResult.valid) {',
        '  throw new Error("Node validator entrypoint failed in tarball smoke test.");',
        '}',
        `const directoryFiles = await readPackageDirectory(${JSON.stringify(exampleDocumentPath)});`,
        'if (!directoryFiles["manifest.json"] || Object.getPrototypeOf(directoryFiles) !== null) throw new Error("Bounded directory export failed in tarball smoke.");',
        `const limitedResult = await validatePackageDirectory(${JSON.stringify(exampleDocumentPath)}, { maxFileBytes: 1 });`,
        'if (limitedResult.valid || limitedResult.errors[0]?.code !== "directory-file-size-limit") throw new Error("Directory budget was ignored in tarball smoke.");'
      ].join("\n")
    );

    const packagerProjectDir = join(scratchRoot, "packager-project");
    await installSmokeProject(packagerProjectDir, [
      tarballs["@eonhive/prd-types"],
      tarballs["@eonhive/prd-validator"],
      tarballs["@eonhive/prd-packager"]
    ], npmCacheDir);
    await writeAndRunNodeCheck(
      packagerProjectDir,
      "check-packager.mjs",
      [
        'import { packDirectoryToBuffer } from "@eonhive/prd-packager";',
        'import { packPackageFiles } from "@eonhive/prd-packager/browser";',
        'import { signPrdArchive } from "@eonhive/prd-packager/signing";',
        'import { verifyPrdSignature, importPrdPublicKey } from "@eonhive/prd-validator/signature";',
        'import { generateKeyPairSync } from "node:crypto";',
        'import { readPrdContainer, readPrdArchive, createPrdContainer } from "@eonhive/prd-validator/container";',
        `const archive = await packDirectoryToBuffer(${JSON.stringify(exampleDocumentPath)});`,
        'if (!(archive instanceof Uint8Array) || archive.byteLength === 0) {',
        '  throw new Error("Packager tarball smoke test did not produce an archive.");',
        '}',
        'const corruptArchive = archive.slice();',
        'const zipView = new DataView(corruptArchive.buffer, corruptArchive.byteOffset, corruptArchive.byteLength);',
        'const centralOffset = zipView.getUint32(corruptArchive.length - 6, true);',
        'zipView.setUint32(14, zipView.getUint32(14, true) ^ 1, true);',
        'zipView.setUint32(centralOffset + 16, zipView.getUint32(centralOffset + 16, true) ^ 1, true);',
        'try {',
        '  readPrdArchive(corruptArchive);',
        '  throw new Error("Installed archive reader ignored a bad CRC.");',
        '} catch (error) {',
        '  if (error.code !== "archive-checksum-mismatch") throw error;',
        '}',
        `const enveloped = await packDirectoryToBuffer(${JSON.stringify(exampleDocumentPath)}, { container: "prd" });`,
        'if (readPrdContainer(enveloped).kind !== "prd" || !readPrdArchive(enveloped)["manifest.json"]) throw new Error("PRD envelope tarball round trip failed.");',
        'try {',
        `  await packDirectoryToBuffer(${JSON.stringify(exampleDocumentPath)}, { limits: { maxFileBytes: 1 } });`,
        '  throw new Error("Packager ignored the directory budget in tarball smoke.");',
        '} catch (error) {',
        '  if (error.code !== "directory-file-size-limit") throw error;',
        '}',
        'const keys = generateKeyPairSync("ed25519");',
        'const namedFiles = readPrdArchive(enveloped);',
        'namedFiles["\\uFEFFmanifest.json"] = new TextEncoder().encode("a separate literal filename");',
        'const namedArchive = packPackageFiles(namedFiles, { container: "prd" });',
        'if (!Object.hasOwn(readPrdArchive(namedArchive), "\\uFEFFmanifest.json")) throw new Error("Installed reader rewrote a literal Unicode filename.");',
        'const invalidName = new Uint8Array(archive);',
        'const nameView = new DataView(invalidName.buffer);',
        'const nameCentral = nameView.getUint32(invalidName.length - 6, true);',
        'nameView.setUint16(6, nameView.getUint16(6, true) | 0x800, true);',
        'nameView.setUint16(nameCentral + 8, nameView.getUint16(nameCentral + 8, true) | 0x800, true);',
        'invalidName[30] = 0xff;',
        'invalidName[nameCentral + 46] = 0xff;',
        'for (const malformed of [invalidName, createPrdContainer(invalidName)]) {',
        '  try { readPrdArchive(malformed); throw new Error("Installed reader accepted malformed UTF-8."); }',
        '  catch (error) { if (error.code !== "archive-read-invalid") throw error; }',
        '}',
        'const signed = await signPrdArchive(namedArchive, keys.privateKey.export({ format: "pem", type: "pkcs8" }).toString());',
        'const trustedPublicKey = await importPrdPublicKey(keys.publicKey.export({ format: "pem", type: "spki" }).toString());',
        'if ((await verifyPrdSignature(readPrdArchive(signed.archive), { trustedPublicKey })).status !== "verified") throw new Error("Signature tarball round trip failed.");'
      ].join("\n")
    );

    const cliProjectDir = join(scratchRoot, "cli-project");
    await installSmokeProject(cliProjectDir, [
      tarballs["@eonhive/prd-types"],
      tarballs["@eonhive/prd-validator"],
      tarballs["@eonhive/prd-packager"],
      tarballs["@eonhive/prd-converter"],
      tarballs["@eonhive/prd-cli"]
    ], npmCacheDir);
    await runCommand(
      process.execPath,
      [
        "./node_modules/@eonhive/prd-cli/dist/cli.js",
        "validate",
        exampleDocumentPath
      ],
      { cwd: cliProjectDir }
    );
    await writeAndRunNodeCheck(cliProjectDir, "check-converter.mjs", [
      'import { convertFileToPrd } from "@eonhive/prd-converter";',
      'import { readFile } from "node:fs/promises";',
      'import { readPrdArchive } from "@eonhive/prd-validator/container";',
      'import { validatePackageFiles } from "@eonhive/prd-validator";',
      `const result = await convertFileToPrd({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-markdown/source.md"))}, outputPath: "converted.prd" });`,
      'const files = readPrdArchive(new Uint8Array(await readFile("converted.prd")));',
      'if (!validatePackageFiles(files).valid || !result.report.sourcePreserved) throw new Error("Converter tarball round trip failed.");'
    ].join("\n"));
    await writeAndRunNodeCheck(cliProjectDir, "check-browser-converter.mjs", [
      'import { readFile } from "node:fs/promises";',
      'import { convertInBrowser, convertMarkdownInBrowser } from "@eonhive/prd-converter/browser";',
      'import { packPackageFiles } from "@eonhive/prd-packager/browser";',
      'import { readPrdArchive } from "@eonhive/prd-validator/container";',
      `const source = { name: "source.md", bytes: new Uint8Array(await readFile(${JSON.stringify(resolve(repoRoot, "examples/conversion-markdown/source.md"))})) };`,
      `const image = { name: "flow.png", bytes: new Uint8Array(await readFile(${JSON.stringify(resolve(repoRoot, "examples/conversion-markdown/flow.png"))})) };`,
      `const html = { name: "source.html", bytes: new Uint8Array(await readFile(${JSON.stringify(resolve(repoRoot, "examples/conversion-html/source.html"))})) };`,
      `const cbz = { name: "sample-comic.cbz", bytes: new Uint8Array(await readFile(${JSON.stringify(resolve(repoRoot, "examples/conversion-cbz/sample-comic.cbz"))})) };`,
      'globalThis.Buffer = undefined;',
      'const result = await convertMarkdownInBrowser({ source, resources: [image] });',
      'if (result.report.nodeCount !== 8 || result.report.resourceCount !== 1) throw new Error("Browser converter export failed.");',
      'const files = readPrdArchive(packPackageFiles(readPrdArchive(result.archive), { container: "prd" }));',
      'if (!files["attachments/source.md"]) throw new Error("Browser package writer lost source retention.");',
      'const htmlResult = await convertInBrowser({ source: html, resources: [image] });',
      'if (htmlResult.report.sourceFormat !== "html" || htmlResult.report.nodeCount !== 11) throw new Error("Browser HTML export failed.");',
      'const comic = await convertInBrowser({ source: cbz, comicPageOrder: "reverse" });',
      'if (comic.document.profile !== "comic" || comic.document.panels[0].id !== "page-3" || comic.report.resourceCount !== 3) throw new Error("Buffer-free browser CBZ export failed.");',
      'const reviewed = await convertInBrowser({ source: cbz, comicPageIds: ["page-2", "page-3", "page-1"] });',
      'if (reviewed.document.profile !== "comic" || reviewed.document.panels[0].id !== "page-2" || !reviewed.report.warnings.some(issue => issue.code === "comic-page-order-reviewed")) throw new Error("Buffer-free comic review failed.");',
      'const described = await convertInBrowser({ source: cbz, comicPageIds: ["page-2", "page-3", "page-1"], comicPageDescriptions: [{ pageId: "page-1", text: "An explicitly supplied description." }] });',
      'if (described.document.profile !== "comic" || described.document.panels[2].alt !== "An explicitly supplied description.") throw new Error("Buffer-free comic description failed.");'
    ].join("\n"));
    await writeAndRunNodeCheck(cliProjectDir, "check-html-converter.mjs", [
      'import { convertFileToPrd } from "@eonhive/prd-converter";',
      `const result = await convertFileToPrd({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-html/source.html"))}, outputPath: "html.prd" });`,
      'if (result.report.sourceFormat !== "html" || result.document.profile !== "general-document") throw new Error("HTML converter tarball round trip failed.");'
    ].join("\n"));
    const htmlDirectory = join(cliProjectDir, "html-directory");
    const htmlImport = await runCommand(process.execPath, [
      "./node_modules/@eonhive/prd-cli/dist/cli.js", "import", "html",
      resolve(repoRoot, "examples/conversion-html/source.html"), "--out", htmlDirectory, "--json"
    ], { cwd: cliProjectDir, capture: true });
    const htmlImportResult = JSON.parse(htmlImport.stdout);
    if (htmlImportResult.contractVersion !== "prd-cli-html-import-v1" || !htmlImportResult.report.validation.valid) {
      throw new Error("HTML directory import failed in the installed CLI.");
    }
    await runCommand(process.execPath, [
      "./node_modules/@eonhive/prd-cli/dist/cli.js", "pack", htmlDirectory, "--out", join(cliProjectDir, "html-directory.prd")
    ], { cwd: cliProjectDir, capture: true });
    const htmlValidation = await runCommand(process.execPath, [
      "./node_modules/@eonhive/prd-cli/dist/cli.js", "validate", join(cliProjectDir, "html-directory.prd"), "--json"
    ], { cwd: cliProjectDir, capture: true });
    if (!JSON.parse(htmlValidation.stdout).valid) throw new Error("Installed CLI HTML archive is invalid.");
    const cbzConversion = await runCommand(process.execPath, [
      "./node_modules/@eonhive/prd-cli/dist/cli.js", "convert",
      resolve(repoRoot, "examples/conversion-cbz/sample-comic.cbz"),
      "--profile", "comic", "--out", join(cliProjectDir, "comic.prd"), "--json"
    ], { cwd: cliProjectDir, capture: true });
    if (JSON.parse(cbzConversion.stdout).quality.resourceCount !== 3) throw new Error("Installed CLI CBZ conversion failed.");
    const epubConversion = await runCommand(process.execPath, [
      "./node_modules/@eonhive/prd-cli/dist/cli.js", "convert",
      resolve(repoRoot, "examples/conversion-epub/portable-chapters.epub"),
      "--out", join(cliProjectDir, "book.prd"), "--json"
    ], { cwd: cliProjectDir, capture: true });
    if (JSON.parse(epubConversion.stdout).quality.nodeCount !== 13) throw new Error("Installed CLI EPUB conversion failed.");
    const docxConversion = await runCommand(process.execPath, [
      "./node_modules/@eonhive/prd-cli/dist/cli.js", "convert",
      resolve(repoRoot, "examples/conversion-docx/source.docx"),
      "--out", join(cliProjectDir, "word.prd"), "--json"
    ], { cwd: cliProjectDir, capture: true });
    if (JSON.parse(docxConversion.stdout).quality.nodeCount !== 12) throw new Error("Installed CLI DOCX conversion failed.");
    const pdfConversion = await runCommand(process.execPath, [
      "./node_modules/@eonhive/prd-cli/dist/cli.js", "convert",
      resolve(repoRoot, "examples/conversion-pdf/source.pdf"),
      "--out", join(cliProjectDir, "pages.prd"), "--json"
    ], { cwd: cliProjectDir, capture: true });
    if (JSON.parse(pdfConversion.stdout).quality.nodeCount !== 14) throw new Error("Installed CLI PDF conversion failed.");
    for (const dependency of ["pdfjs-dist", "@napi-rs/canvas"]) {
      const installed = join(cliProjectDir, "node_modules", dependency);
      const disabled = `${installed}-disabled`;
      await rename(installed, disabled);
      try {
        await writeAndRunNodeCheck(cliProjectDir, "check-converter-without-pdf.mjs", [
          'import { convertDocument } from "@eonhive/prd-converter";',
          `await convertDocument({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-markdown/source.md"))} });`,
          `await convertDocument({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-html/source.html"))} });`,
          `await convertDocument({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-cbz/sample-comic.cbz"))} });`,
          `await convertDocument({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-epub/portable-chapters.epub"))} });`,
          `await convertDocument({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-docx/source.docx"))} });`,
          'let failedAsExpected = false;',
          `try { await convertDocument({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-pdf/source.pdf"))} }); }`,
          'catch (error) { failedAsExpected = error.message.includes("PDF conversion requires optional pdfjs-dist"); }',
          'if (!failedAsExpected) throw new Error("Missing PDF dependency did not produce the expected PDF-only diagnostic.");'
        ].join("\n"));
      } finally {
        await rename(disabled, installed);
      }
    }
    await rename(join(cliProjectDir, "node_modules/saxes"), join(cliProjectDir, "node_modules/.saxes-disabled"));
    await writeAndRunNodeCheck(cliProjectDir, "check-converter-without-xml.mjs", [
      'import { convertDocument } from "@eonhive/prd-converter";',
      `await convertDocument({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-markdown/source.md"))} });`,
      `await convertDocument({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-cbz/sample-comic.cbz"))} });`,
      `await convertDocument({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-html/source.html"))} });`,
      `await convertDocument({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-pdf/source.pdf"))} });`,
      'let failedAsExpected = false;',
      `try { await convertDocument({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-epub/portable-chapters.epub"))} }); }`,
      'catch (error) { failedAsExpected = error.message.includes("optional saxes dependency"); }',
      'if (!failedAsExpected) throw new Error("Missing optional XML parser did not produce the expected EPUB-only diagnostic.");',
      'failedAsExpected = false;',
      `try { await convertDocument({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-docx/source.docx"))} }); }`,
      'catch (error) { failedAsExpected = error.message.includes("DOCX conversion requires the optional saxes dependency"); }',
      'if (!failedAsExpected) throw new Error("Missing XML parser did not produce the expected DOCX diagnostic.");'
    ].join("\n"));
    await rename(join(cliProjectDir, "node_modules/.saxes-disabled"), join(cliProjectDir, "node_modules/saxes"));
    // Simulate an installation without optional dependencies using only this disposable project.
    await rm(join(cliProjectDir, "node_modules/parse5"), { recursive: true, force: true });
    await writeAndRunNodeCheck(cliProjectDir, "check-converter-without-html.mjs", [
      'import { convertDocument } from "@eonhive/prd-converter";',
      'import { convertInBrowser } from "@eonhive/prd-converter/browser";',
      'import { readFile } from "node:fs/promises";',
      `const browserMarkdown = await convertInBrowser({ source: { name: "source.md", bytes: new Uint8Array(await readFile(${JSON.stringify(resolve(repoRoot, "examples/conversion-markdown/source.md"))})) } });`,
      'if (browserMarkdown.report.sourceFormat !== "markdown") throw new Error("Browser Markdown requires an unexpected HTML parser.");',
      `const browserComic = await convertInBrowser({ source: { name: "sample-comic.cbz", bytes: new Uint8Array(await readFile(${JSON.stringify(resolve(repoRoot, "examples/conversion-cbz/sample-comic.cbz"))})) } });`,
      'if (browserComic.report.profile !== "comic" || browserComic.report.resourceCount !== 3) throw new Error("Browser CBZ requires an unexpected HTML parser.");',
      `const markdown = await convertDocument({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-markdown/source.md"))} });`,
      'if (markdown.report.sourceFormat !== "markdown") throw new Error("Markdown must remain independent of the HTML parser.");',
      `const comic = await convertDocument({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-cbz/sample-comic.cbz"))} });`,
      'if (comic.report.sourceFormat !== "cbz" || comic.document.profile !== "comic") throw new Error("CBZ must remain independent of the HTML parser.");',
      `const book = await convertDocument({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-epub/portable-chapters.epub"))} });`,
      'if (book.report.sourceFormat !== "epub") throw new Error("EPUB XML extraction must remain independent of the HTML parser.");',
      `const word = await convertDocument({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-docx/source.docx"))} });`,
      'if (word.report.sourceFormat !== "docx") throw new Error("DOCX must remain independent of the HTML parser.");',
      `const pdf = await convertDocument({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-pdf/source.pdf"))} });`,
      'if (pdf.report.sourceFormat !== "pdf") throw new Error("PDF must remain independent of the HTML parser.");',
      'let failedAsExpected = false;',
      `try { await convertDocument({ sourcePath: ${JSON.stringify(resolve(repoRoot, "examples/conversion-html/source.html"))} }); }`,
      'catch (error) { failedAsExpected = error.message.includes("optional parse5 dependency"); }',
      'if (!failedAsExpected) throw new Error("Missing optional HTML parser did not produce the expected diagnostic.");',
      'failedAsExpected = false;',
      `try { await convertInBrowser({ source: { name: "source.html", bytes: new Uint8Array(await readFile(${JSON.stringify(resolve(repoRoot, "examples/conversion-html/source.html"))})) } }); }`,
      'catch (error) { failedAsExpected = error.message.includes("optional parse5 dependency"); }',
      'if (!failedAsExpected) throw new Error("Browser HTML must fail clearly without its optional parser.");'
    ].join("\n"));
  } finally {
    if (process.env.KEEP_RELEASE_SMOKE !== "1") {
      await rm(scratchRoot, { recursive: true, force: true });
    }
  }
}

const currentPath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;

if (invokedPath === currentPath) {
  runReleaseSmoke().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
