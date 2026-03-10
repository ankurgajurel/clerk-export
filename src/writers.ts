import * as fs from "node:fs";
import * as path from "node:path";
import { stringify } from "csv-stringify/sync";
import type { ExportResult } from "./exporters";

export type OutputFormat = "json" | "csv" | "jsonl";

function flattenObject(obj: any, prefix = ""): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey));
    } else if (Array.isArray(value)) {
      result[fullKey] = JSON.stringify(value);
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

export function writeExport(result: ExportResult, outputDir: string, format: OutputFormat): string {
  fs.mkdirSync(outputDir, { recursive: true });

  const filePath = path.join(outputDir, `${result.name}.${format}`);

  if (result.data.length === 0) {
    // Write empty file
    fs.writeFileSync(filePath, format === "json" ? "[]" : "");
    return filePath;
  }

  switch (format) {
    case "json": {
      fs.writeFileSync(filePath, JSON.stringify(result.data, null, 2));
      break;
    }

    case "jsonl": {
      const lines = result.data.map((item) => JSON.stringify(item));
      fs.writeFileSync(filePath, lines.join("\n") + "\n");
      break;
    }

    case "csv": {
      const flattened = result.data.map((item) => flattenObject(item));

      // Collect all possible headers
      const headerSet = new Set<string>();
      for (const row of flattened) {
        for (const key of Object.keys(row)) {
          headerSet.add(key);
        }
      }
      const headers = Array.from(headerSet);

      const csvData = stringify(flattened, {
        header: true,
        columns: headers,
        cast: {
          boolean: (value) => (value ? "true" : "false"),
        },
      });
      fs.writeFileSync(filePath, csvData);
      break;
    }
  }

  return filePath;
}
