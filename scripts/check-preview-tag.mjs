import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validatePreviewTag } from "./prepare-preview-release.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRecord = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
const tag = process.argv[2];

if (!tag) throw new Error("A preview tag is required.");
validatePreviewTag(tag, packageRecord.version);
process.stdout.write(`Preview tag ${tag} matches package version ${packageRecord.version}.\n`);
