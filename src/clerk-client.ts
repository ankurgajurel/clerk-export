/**
 * Direct Clerk Backend API client using fetch.
 * We use raw API calls instead of the SDK for full control over pagination
 * and access to every endpoint including ones the SDK doesn't expose nicely.
 */

const BASE_URL = "https://api.clerk.com/v1";

export interface PaginatedResponse<T> {
  data: T[];
  total_count: number;
}

export function createClient(secretKey: string) {
  async function request<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, value);
        }
      }
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Clerk API ${res.status} on ${path}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  async function paginate<T>(path: string, extraParams?: Record<string, string>): Promise<T[]> {
    const all: T[] = [];
    const limit = 100;
    let offset = 0;

    while (true) {
      const params = { ...extraParams, limit: String(limit), offset: String(offset) };
      const res = await request<PaginatedResponse<T> | T[]>(path, params);

      // Some endpoints return { data: [], total_count } and some return plain arrays
      let batch: T[];
      let totalCount: number | undefined;

      if (Array.isArray(res)) {
        batch = res;
      } else if (res && typeof res === "object" && "data" in res) {
        batch = res.data;
        totalCount = res.total_count;
      } else {
        // Single item or unexpected shape - wrap it
        batch = [res as T];
      }

      all.push(...batch);

      if (batch.length < limit) break;
      if (totalCount !== undefined && all.length >= totalCount) break;

      offset += limit;
    }

    return all;
  }

  return {
    // Users
    async getUsers() {
      return paginate<any>("/users");
    },

    async getUser(userId: string) {
      return request<any>(`/users/${userId}`);
    },

    async getUserOAuthAccessTokens(userId: string, provider: string) {
      return request<any[]>(`/users/${userId}/oauth_access_tokens/${provider}`);
    },

    // Organizations
    async getOrganizations() {
      return paginate<any>("/organizations", { include_members_count: "true" });
    },

    async getOrganization(orgId: string) {
      return request<any>(`/organizations/${orgId}`);
    },

    async getOrganizationMemberships(orgId: string) {
      return paginate<any>(`/organizations/${orgId}/memberships`);
    },

    async getOrganizationInvitations(orgId: string) {
      return paginate<any>(`/organizations/${orgId}/invitations`, { status: "pending" });
    },

    async getOrganizationRoles() {
      return paginate<any>("/organization_roles");
    },

    async getOrganizationPermissions() {
      return paginate<any>("/organization_permissions");
    },

    // Sessions
    async getSessions() {
      return paginate<any>("/sessions");
    },

    // Invitations (instance-level)
    async getInvitations() {
      return paginate<any>("/invitations");
    },

    // Allowlist
    async getAllowlistIdentifiers() {
      return request<any[]>("/allowlist_identifiers");
    },

    // Blocklist
    async getBlocklistIdentifiers() {
      return request<any[]>("/blocklist_identifiers");
    },

    // JWT Templates
    async getJWTTemplates() {
      return request<any[]>("/jwt_templates");
    },

    // Email addresses / phone numbers for a user
    async getUserEmailAddresses(userId: string) {
      // These are included in user objects, but this is here if needed
      return request<any>(`/email_addresses`);
    },

    // Clients
    async getClients() {
      return paginate<any>("/clients");
    },

    // Instance settings
    async getInstanceSettings() {
      return request<any>("/beta_features");
    },
  };
}

export type ClerkClient = ReturnType<typeof createClient>;
