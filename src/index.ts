#!/usr/bin/env bun

import { Command } from "commander";
import { ALL_EXPORTERS } from "./exporters";
import type { ExporterName } from "./exporters";
import type { OutputFormat } from "./writers";
import { runExport } from "./runner";
import { startTUI } from "./tui";
import { c } from "./colors";

const RESOURCE_NAMES = Object.keys(ALL_EXPORTERS) as ExporterName[];

// If no args besides the script itself, launch TUI
const hasArgs = process.argv.length > 2;

if (!hasArgs) {
  startTUI().catch((err) => {
    // Handle ctrl+c gracefully
    if (err.name === "ExitPromptError") {
      console.log(c.gray("\n  Bye.\n"));
      process.exit(0);
    }
    console.error(err);
    process.exit(1);
  });
} else {
  const program = new Command();

  program
    .name("clerk-export")
    .description("Export everything from your Clerk instance. Run without args for interactive mode.")
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
        console.error(c.gray("Pass it with --key or set CLERK_SECRET_KEY env var."));
        console.error(c.gray("Or run without args for interactive mode."));
        process.exit(1);
      }

      if (!secretKey.startsWith("sk_")) {
        console.error(c.red("Error: Secret key should start with sk_"));
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

      const { hasError } = await runExport({
        secretKey,
        resources,
        format,
        outputDir: opts.output,
      });

      if (hasError) process.exit(1);
    });

  program.parse();
}
