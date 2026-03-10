import type { ClerkClient } from "./clerk-client";
import { c } from "./colors";

export interface ExportResult {
  name: string;
  data: any[];
  count: number;
}

function log(msg: string) {
  console.log(c.gray(`  ${msg}`));
}

export async function exportUsers(client: ClerkClient): Promise<ExportResult> {
  const users = await client.getUsers();

  // Enrich each user with full details including all metadata
  const enriched = users.map((user: any) => ({
    id: user.id,
    external_id: user.external_id,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    primary_email: user.email_addresses?.find((e: any) => e.id === user.primary_email_address_id)?.email_address ?? null,
    primary_phone: user.phone_numbers?.find((p: any) => p.id === user.primary_phone_number_id)?.phone_number ?? null,
    email_addresses: user.email_addresses?.map((e: any) => ({
      id: e.id,
      email: e.email_address,
      verified: e.verification?.status === "verified",
      linked_to: e.linked_to,
    })) ?? [],
    phone_numbers: user.phone_numbers?.map((p: any) => ({
      id: p.id,
      phone: p.phone_number,
      verified: p.verification?.status === "verified",
    })) ?? [],
    web3_wallets: user.web3_wallets ?? [],
    external_accounts: user.external_accounts?.map((ea: any) => ({
      id: ea.id,
      provider: ea.provider,
      email: ea.email_address,
      username: ea.username,
      first_name: ea.first_name,
      last_name: ea.last_name,
      avatar_url: ea.avatar_url,
      provider_user_id: ea.provider_user_id,
    })) ?? [],
    public_metadata: user.public_metadata ?? {},
    private_metadata: user.private_metadata ?? {},
    unsafe_metadata: user.unsafe_metadata ?? {},
    profile_image_url: user.profile_image_url ?? user.image_url,
    has_image: user.has_image,
    two_factor_enabled: user.two_factor_enabled,
    totp_enabled: user.totp_enabled,
    backup_code_enabled: user.backup_code_enabled,
    password_enabled: user.password_enabled,
    banned: user.banned,
    locked: user.locked,
    last_sign_in_at: user.last_sign_in_at,
    last_active_at: user.last_active_at,
    created_at: user.created_at,
    updated_at: user.updated_at,
  }));

  log(`Found ${enriched.length} users`);
  return { name: "users", data: enriched, count: enriched.length };
}

export async function exportOrganizations(client: ClerkClient): Promise<ExportResult> {
  const orgs = await client.getOrganizations();

  const enriched = orgs.map((org: any) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    max_allowed_memberships: org.max_allowed_memberships,
    members_count: org.members_count,
    public_metadata: org.public_metadata ?? {},
    private_metadata: org.private_metadata ?? {},
    image_url: org.image_url,
    has_image: org.has_image,
    created_by: org.created_by,
    created_at: org.created_at,
    updated_at: org.updated_at,
  }));

  log(`Found ${enriched.length} organizations`);
  return { name: "organizations", data: enriched, count: enriched.length };
}

export async function exportOrganizationMemberships(client: ClerkClient): Promise<ExportResult> {
  const orgs = await client.getOrganizations();
  const allMemberships: any[] = [];

  for (const org of orgs) {
    const memberships = await client.getOrganizationMemberships(org.id);
    for (const m of memberships) {
      allMemberships.push({
        organization_id: org.id,
        organization_name: org.name,
        organization_slug: org.slug,
        user_id: m.public_user_data?.user_id ?? null,
        identifier: m.public_user_data?.identifier ?? null,
        first_name: m.public_user_data?.first_name ?? null,
        last_name: m.public_user_data?.last_name ?? null,
        profile_image_url: m.public_user_data?.profile_image_url ?? null,
        role: m.role,
        public_metadata: m.public_metadata ?? {},
        private_metadata: m.private_metadata ?? {},
        created_at: m.created_at,
        updated_at: m.updated_at,
      });
    }
  }

  log(`Found ${allMemberships.length} memberships across ${orgs.length} orgs`);
  return { name: "organization_memberships", data: allMemberships, count: allMemberships.length };
}

export async function exportOrganizationInvitations(client: ClerkClient): Promise<ExportResult> {
  const orgs = await client.getOrganizations();
  const allInvitations: any[] = [];

  for (const org of orgs) {
    try {
      const invitations = await client.getOrganizationInvitations(org.id);
      for (const inv of invitations) {
        allInvitations.push({
          organization_id: org.id,
          organization_name: org.name,
          id: inv.id,
          email_address: inv.email_address,
          role: inv.role,
          status: inv.status,
          public_metadata: inv.public_metadata ?? {},
          private_metadata: inv.private_metadata ?? {},
          created_at: inv.created_at,
          updated_at: inv.updated_at,
        });
      }
    } catch {
      // Org might not have invitations enabled
    }
  }

  log(`Found ${allInvitations.length} pending org invitations`);
  return { name: "organization_invitations", data: allInvitations, count: allInvitations.length };
}

export async function exportOrganizationRoles(client: ClerkClient): Promise<ExportResult> {
  try {
    const roles = await client.getOrganizationRoles();
    log(`Found ${roles.length} organization roles`);
    return { name: "organization_roles", data: roles, count: roles.length };
  } catch {
    log("Organization roles endpoint not available");
    return { name: "organization_roles", data: [], count: 0 };
  }
}

export async function exportOrganizationPermissions(client: ClerkClient): Promise<ExportResult> {
  try {
    const perms = await client.getOrganizationPermissions();
    log(`Found ${perms.length} organization permissions`);
    return { name: "organization_permissions", data: perms, count: perms.length };
  } catch {
    log("Organization permissions endpoint not available");
    return { name: "organization_permissions", data: [], count: 0 };
  }
}

export async function exportInvitations(client: ClerkClient): Promise<ExportResult> {
  try {
    const invitations = await client.getInvitations();
    log(`Found ${invitations.length} instance invitations`);
    return { name: "invitations", data: invitations, count: invitations.length };
  } catch {
    log("Invitations endpoint not available");
    return { name: "invitations", data: [], count: 0 };
  }
}

export async function exportSessions(client: ClerkClient): Promise<ExportResult> {
  try {
    const sessions = await client.getSessions();

    const mapped = sessions.map((s: any) => ({
      id: s.id,
      user_id: s.user_id,
      client_id: s.client_id,
      status: s.status,
      last_active_at: s.last_active_at,
      expire_at: s.expire_at,
      abandon_at: s.abandon_at,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));

    log(`Found ${mapped.length} sessions`);
    return { name: "sessions", data: mapped, count: mapped.length };
  } catch {
    log("Sessions endpoint not available or returned error");
    return { name: "sessions", data: [], count: 0 };
  }
}

export async function exportAllowlist(client: ClerkClient): Promise<ExportResult> {
  try {
    const items = await client.getAllowlistIdentifiers();
    const list = Array.isArray(items) ? items : [];
    log(`Found ${list.length} allowlist identifiers`);
    return { name: "allowlist", data: list, count: list.length };
  } catch {
    log("Allowlist not enabled or not available");
    return { name: "allowlist", data: [], count: 0 };
  }
}

export async function exportBlocklist(client: ClerkClient): Promise<ExportResult> {
  try {
    const items = await client.getBlocklistIdentifiers();
    const list = Array.isArray(items) ? items : [];
    log(`Found ${list.length} blocklist identifiers`);
    return { name: "blocklist", data: list, count: list.length };
  } catch {
    log("Blocklist not available");
    return { name: "blocklist", data: [], count: 0 };
  }
}

export async function exportJWTTemplates(client: ClerkClient): Promise<ExportResult> {
  try {
    const templates = await client.getJWTTemplates();
    const list = Array.isArray(templates) ? templates : [];
    log(`Found ${list.length} JWT templates`);
    return { name: "jwt_templates", data: list, count: list.length };
  } catch {
    log("JWT Templates not available");
    return { name: "jwt_templates", data: [], count: 0 };
  }
}

export const ALL_EXPORTERS = {
  users: exportUsers,
  organizations: exportOrganizations,
  organization_memberships: exportOrganizationMemberships,
  organization_invitations: exportOrganizationInvitations,
  organization_roles: exportOrganizationRoles,
  organization_permissions: exportOrganizationPermissions,
  invitations: exportInvitations,
  sessions: exportSessions,
  allowlist: exportAllowlist,
  blocklist: exportBlocklist,
  jwt_templates: exportJWTTemplates,
} as const;

export type ExporterName = keyof typeof ALL_EXPORTERS;
