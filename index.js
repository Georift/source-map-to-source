#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { normalize, dirname, basename, resolve } from "path";
import * as fs from "fs";
import { SourceMapConsumer } from "source-map";
import assert from "assert";

const argv = yargs(hideBin(process.argv))
  .command("<source map>", "extract all source files")
  .option("output", {
    describe: "directory to output the sources to",
  })
  .demandCommand(1)
  .parse();

const inputFile = resolve(process.cwd(), argv._[0]);
const map = JSON.parse(fs.readFileSync(inputFile).toString());

/**
 * Remove any `../` prefixes from a path
 * @param {*} path
 * @returns
 */
const stripUpwardsTraversal = (path) => {
  const removeDotDotPrefixes = /^(\.\.\/)+/;
  return normalize(path).replace(removeDotDotPrefixes, "");
};

assert(stripUpwardsTraversal("../../test.ts") === "test.ts");
assert(stripUpwardsTraversal(".././../test.ts") === "test.ts");
assert(stripUpwardsTraversal("./test.ts") === "test.ts");

/**
 * Remove and query params from the source path
 * @param {*} path
 * @returns
 */
const removeQuerySuffix = (path) => {
  const removeQuerySuffix = /\?.*$/;
  return path.replace(removeQuerySuffix, "");
};

assert(removeQuerySuffix("./test.ts?abc=123") === "./test.ts");
assert(removeQuerySuffix("./test.ts?") === "./test.ts");
assert(removeQuerySuffix("./index.css?8415") === "./index.css");

(async () => {
  const consumer = await new SourceMapConsumer(map);

  const sourceFiles = consumer.sources.map((path) => [
    removeQuerySuffix(stripUpwardsTraversal(path)), // save path
    path,
    consumer.sourceContentFor(path),
  ]);

  const duplicates = new Set();
  const toSave = new Set();

  sourceFiles.forEach(([savePath, sourcePath]) => {
    if (toSave.has(savePath)) {
      duplicates.add(sourcePath);
    } else {
      toSave.add(savePath);
    }
  });

  if (duplicates.size > 0) {
    console.warn(
      "When removing upwards traversal prefix, the following files would overwrite an existing file so they were skipped"
    );
    console.warn(duplicates);
  }

  const toWrite = sourceFiles.filter(([savePath]) => !duplicates.has(savePath));

  const outputDirectory = resolve(
    process.cwd(),
    argv.output || basename(inputFile) + "-sources"
  );
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory);
  }

  // write to the output directory
  toWrite.forEach(([savePath, _, content]) => {
    const outputPath = resolve(outputDirectory, savePath);
    const directory = dirname(outputPath);

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    fs.writeFileSync(outputPath, content);
  });

  console.log(`Wrote ${toWrite.length} files to ${outputDirectory}`);
})();
