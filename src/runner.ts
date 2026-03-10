import { createClient } from "./clerk-client";
import { ALL_EXPORTERS } from "./exporters";
import type { ExporterName, ExportResult } from "./exporters";
import { writeExport } from "./writers";
import type { OutputFormat } from "./writers";
import { c } from "./colors";
import * as path from "node:path";

export interface RunOptions {
  secretKey: string;
  resources: ExporterName[];
  format: OutputFormat;
  outputDir: string;
}

export async function runExport(opts: RunOptions) {
  const { secretKey, resources, format } = opts;
  const outputDir = path.resolve(opts.outputDir);
  const client = createClient(secretKey);

  console.log(c.bold("\n🔑 clerk-export\n"));
  console.log(c.gray(`Format:    ${format}`));
  console.log(c.gray(`Output:    ${outputDir}`));
  console.log(c.gray(`Resources: ${resources.join(", ")}\n`));

  const results: ExportResult[] = [];
  let hasError = false;

  for (const resource of resources) {
    const exportFn = ALL_EXPORTERS[resource];
    process.stdout.write(c.cyan(`  ⏳ Exporting ${resource}...`));

    try {
      const result = await exportFn(client);
      const filePath = writeExport(result, outputDir, format);
      results.push(result);
      process.stdout.write(`\r  ${c.green(`✅ ${resource}`)} → ${c.gray(filePath)} (${result.count} records)\n`);
    } catch (err: any) {
      hasError = true;
      process.stdout.write(`\r  ${c.red(`❌ ${resource}`)} → ${err.message}\n`);
    }
  }

  console.log(c.bold("\n📊 Export Summary\n"));
  console.log(c.gray("  " + "─".repeat(50)));

  let totalRecords = 0;
  for (const r of results) {
    const countStr = String(r.count).padStart(6);
    console.log(`  ${r.name.padEnd(30)} ${c.yellow(countStr)} records`);
    totalRecords += r.count;
  }

  console.log(c.gray("  " + "─".repeat(50)));
  console.log(`  ${c.bold("Total".padEnd(30))} ${c.yellow(String(totalRecords).padStart(6))} records`);
  console.log(c.gray(`\n  Files written to ${outputDir}\n`));

  return { results, totalRecords, hasError };
}
