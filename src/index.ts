#!/usr/bin/env bun

import { Command } from "commander";
import { createClient } from "./clerk-client";
import { ALL_EXPORTERS } from "./exporters";
import type { ExporterName, ExportResult } from "./exporters";
import { writeExport } from "./writers";
import type { OutputFormat } from "./writers";
import { c } from "./colors";
import * as path from "node:path";

const RESOURCE_NAMES = Object.keys(ALL_EXPORTERS) as ExporterName[];

const program = new Command();

program
  .name("clerk-export")
  .description("Export everything from your Clerk instance - users, orgs, memberships, metadata, roles, permissions, the works.")
  .version("1.0.0")
  .option("-k, --key <secret_key>", "Clerk secret key (or set CLERK_SECRET_KEY env var)")
  .option(
    "-r, --resources <resources>",
    `Comma-separated resources to export. Available: ${RESOURCE_NAMES.join(", ")}. Default: all`,
  )
  .option("-f, --format <format>", "Output format: json, csv, jsonl", "json")
  .option("-o, --output <dir>", "Output directory", "./clerk-export-data")
  .action(async (opts) => {
    const secretKey = opts.key || process.env.CLERK_SECRET_KEY;

    if (!secretKey) {
      console.error(c.red("Error: No Clerk secret key provided."));
      console.error(c.gray("Pass it with --key or set CLERK_SECRET_KEY environment variable."));
      console.error(c.gray("You can find your secret key at https://dashboard.clerk.com → API Keys"));
      process.exit(1);
    }

    if (!secretKey.startsWith("sk_")) {
      console.error(c.red("Error: That doesn't look like a Clerk secret key (should start with sk_)"));
      process.exit(1);
    }

    const format = opts.format as OutputFormat;
    if (!["json", "csv", "jsonl"].includes(format)) {
      console.error(c.red(`Invalid format: ${format}. Use json, csv, or jsonl.`));
      process.exit(1);
    }

    const resources: ExporterName[] = opts.resources
      ? opts.resources.split(",").map((r: string) => r.trim() as ExporterName)
      : [...RESOURCE_NAMES];

    for (const r of resources) {
      if (!RESOURCE_NAMES.includes(r)) {
        console.error(c.red(`Unknown resource: ${r}`));
        console.error(c.gray(`Available: ${RESOURCE_NAMES.join(", ")}`));
        process.exit(1);
      }
    }

    const outputDir = path.resolve(opts.output);
    const client = createClient(secretKey);

    console.log(c.bold("\n🔑 clerk-export\n"));
    console.log(c.gray(`Format:    ${format}`));
    console.log(c.gray(`Output:    ${outputDir}`));
    console.log(c.gray(`Resources: ${resources.join(", ")}\n`));

    const results: ExportResult[] = [];
    let hasError = false;

    for (const resource of resources) {
      const exportFn = ALL_EXPORTERS[resource];
      process.stdout.write(c.cyan(`⏳ Exporting ${resource}...`));

      try {
        const result = await exportFn(client);
        const filePath = writeExport(result, outputDir, format);
        results.push(result);
        process.stdout.write(`\r${c.green(`✅ ${resource}`)} → ${c.gray(filePath)} (${result.count} records)\n`);
      } catch (err: any) {
        hasError = true;
        process.stdout.write(`\r${c.red(`❌ ${resource}`)} → ${err.message}\n`);
      }
    }

    console.log(c.bold("\n📊 Export Summary\n"));
    console.log(c.gray("─".repeat(50)));

    let totalRecords = 0;
    for (const r of results) {
      const countStr = String(r.count).padStart(6);
      console.log(`  ${r.name.padEnd(30)} ${c.yellow(countStr)} records`);
      totalRecords += r.count;
    }

    console.log(c.gray("─".repeat(50)));
    console.log(`  ${c.bold("Total".padEnd(30))} ${c.yellow(String(totalRecords).padStart(6))} records`);
    console.log(c.gray(`\n  Files written to ${outputDir}\n`));

    if (hasError) {
      console.log(c.yellow("⚠️  Some resources failed to export. Check errors above.\n"));
      process.exit(1);
    }
  });

program.parse();
