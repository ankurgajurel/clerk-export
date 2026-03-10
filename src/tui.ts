import { input, password, select, checkbox, confirm } from "@inquirer/prompts";
import { ALL_EXPORTERS } from "./exporters";
import type { ExporterName } from "./exporters";
import type { OutputFormat } from "./writers";
import { runExport } from "./runner";
import { c } from "./colors";

const RESOURCE_NAMES = Object.keys(ALL_EXPORTERS) as ExporterName[];

const RESOURCE_DESCRIPTIONS: Record<ExporterName, string> = {
  users: "Users (emails, phones, OAuth, metadata, 2FA, etc.)",
  organizations: "Organizations (metadata, member counts)",
  organization_memberships: "Org Memberships (members, roles, metadata)",
  organization_invitations: "Org Invitations (pending invites)",
  organization_roles: "Org Roles (system + custom)",
  organization_permissions: "Org Permissions",
  invitations: "Instance Invitations",
  sessions: "Sessions (active)",
  allowlist: "Allowlist Identifiers",
  blocklist: "Blocklist Identifiers",
  jwt_templates: "JWT Templates",
};

function banner() {
  console.log("");
  console.log(c.bold(c.cyan("  ┌─────────────────────────────────┐")));
  console.log(c.bold(c.cyan("  │                                 │")));
  console.log(c.bold(c.cyan("  │") + "       clerk-export              " + c.cyan("│")));
  console.log(c.bold(c.cyan("  │") + c.gray("   export everything from clerk  ") + c.cyan("│")));
  console.log(c.bold(c.cyan("  │                                 │")));
  console.log(c.bold(c.cyan("  └─────────────────────────────────┘")));
  console.log("");
}

export async function startTUI() {
  banner();

  // secret key
  const envKey = process.env.CLERK_SECRET_KEY;
  let secretKey: string;

  if (envKey) {
    const useEnv = await confirm({
      message: `Found CLERK_SECRET_KEY in env (${envKey.slice(0, 10)}...). Use it?`,
      default: true,
    });
    if (useEnv) {
      secretKey = envKey;
    } else {
      secretKey = await password({
        message: "Enter your Clerk secret key:",
        validate: (val) => {
          if (!val.startsWith("sk_")) return "Secret key must start with sk_";
          return true;
        },
      });
    }
  } else {
    secretKey = await password({
      message: "Enter your Clerk secret key:",
      validate: (val) => {
        if (!val.startsWith("sk_")) return "Secret key must start with sk_";
        return true;
      },
    });
  }

  // resource selection mode
  const mode = await select({
    message: "What do you want to export?",
    choices: [
      { name: "Everything", value: "all" },
      { name: "Let me pick", value: "pick" },
    ],
  });

  let resources: ExporterName[];

  if (mode === "pick") {
    resources = await checkbox({
      message: "Select resources to export:",
      choices: RESOURCE_NAMES.map((name) => ({
        name: RESOURCE_DESCRIPTIONS[name],
        value: name,
        checked: false,
      })),
      required: true,
    });
  } else {
    resources = [...RESOURCE_NAMES];
  }

  // format
  const format = await select<OutputFormat>({
    message: "Output format:",
    choices: [
      { name: "JSON  — pretty-printed, one file per resource", value: "json" },
      { name: "CSV   — flattened, good for spreadsheets", value: "csv" },
      { name: "JSONL — one object per line, good for piping", value: "jsonl" },
    ],
  });

  // output dir
  const outputDir = await input({
    message: "Output directory:",
    default: "./clerk-export-data",
  });

  // confirm
  console.log("");
  console.log(c.gray("  " + "─".repeat(40)));
  console.log(`  ${c.bold("Resources:")} ${resources.length === RESOURCE_NAMES.length ? "all" : resources.join(", ")}`);
  console.log(`  ${c.bold("Format:")}    ${format}`);
  console.log(`  ${c.bold("Output:")}    ${outputDir}`);
  console.log(c.gray("  " + "─".repeat(40)));
  console.log("");

  const go = await confirm({
    message: "Start export?",
    default: true,
  });

  if (!go) {
    console.log(c.gray("\n  Cancelled.\n"));
    process.exit(0);
  }

  const { hasError } = await runExport({
    secretKey,
    resources,
    format,
    outputDir,
  });

  if (hasError) {
    process.exit(1);
  }
}
