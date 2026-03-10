# clerk-export

CLI tool to export all data from a [Clerk](https://clerk.com) instance. Goes beyond Clerk's built-in export — pulls every resource including private metadata, org memberships, roles, permissions, and more.

## Requirements

- [Bun](https://bun.sh) >= 1.0
- A Clerk secret key (`sk_live_*` or `sk_test_*`)

## Install

```bash
git clone <repo-url> && cd clerk-export
bun install
```

## Usage

```bash
# export everything
bun run start --key sk_live_xxx

# or use env var
export CLERK_SECRET_KEY=sk_live_xxx
bun run start

# specific resources only
bun run start -r users,organizations

# output as csv or jsonl
bun run start -f csv -o ./export

# all options
bun run start --help
```

## Resources

| Resource | Description |
|---|---|
| `users` | All users with email addresses, phone numbers, external accounts (OAuth), web3 wallets, public/private/unsafe metadata, 2FA status, ban/lock status |
| `organizations` | All orgs with public/private metadata, member counts |
| `organization_memberships` | Every member of every org with roles and metadata |
| `organization_invitations` | Pending org-level invitations |
| `organization_roles` | System and custom roles |
| `organization_permissions` | All permissions |
| `invitations` | Instance-level invitations |
| `sessions` | Active sessions |
| `allowlist` | Allowlisted identifiers |
| `blocklist` | Blocklisted identifiers |
| `jwt_templates` | JWT template configurations |

## Output Formats

- **json** (default) — pretty-printed, one file per resource
- **csv** — flattened with nested objects as JSON strings in cells
- **jsonl** — one JSON object per line, good for streaming/piping

## Project Structure

```
src/
├── index.ts          # CLI entry point
├── clerk-client.ts   # Raw Clerk Backend API client with pagination
├── exporters.ts      # Per-resource export logic
├── writers.ts        # JSON/CSV/JSONL file writers
└── colors.ts         # Terminal colors
```

## License

ISC
