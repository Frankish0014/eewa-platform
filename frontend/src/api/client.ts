/**
 * API client — base URL from env, attaches JWT, handles 401.
 */
const API_BASE = import.meta.env.VITE_API_URL ?? '';

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

export type Role = 'Student' | 'Mentor' | 'Admin' | 'InstitutionStaff' | 'OpportunityProvider';

export interface User {
  userId: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface MeResponse {
  user: User;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(typeof options.headers === 'object' && !(options.headers instanceof Headers)
      ? (options.headers as Record<string, string>)
      : {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    if (!isRetry && path !== '/api/auth/refresh' && path !== '/api/auth/login' && path !== '/api/auth/register') {
      try {
        await refreshToken();
        return request<T>(path, options, true);
      } catch {
        // Refresh failed, fall through to clear and throw
      }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.dispatchEvent(new Event('auth:logout'));
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export async function register(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}): Promise<LoginResponse> {
  const data = await api.post<LoginResponse>('/api/auth/register', input);
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const data = await api.post<LoginResponse>('/api/auth/login', { email, password });
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
}

export async function refreshToken(): Promise<string> {
  const refresh = localStorage.getItem('refreshToken');
  if (!refresh) throw new Error('No refresh token');
  const data = await api.post<{ accessToken: string }>('/api/auth/refresh', { refreshToken: refresh });
  localStorage.setItem('accessToken', data.accessToken);
  return data.accessToken;
}

export function logout(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export async function getMe(): Promise<MeResponse> {
  return api.get<MeResponse>('/api/me');
}

export interface Profile {
  userId: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export async function getProfile(): Promise<{ profile: Profile }> {
  return api.get<{ profile: Profile }>('/api/profile');
}

export async function updateProfile(data: { firstName?: string; lastName?: string }): Promise<{ profile: Profile }> {
  return api.patch<{ profile: Profile }>('/api/profile', data);
}

export interface Sector {
  id: string;
  name: string;
  description: string | null;
}

export async function getSectors(): Promise<{ sectors: Sector[] }> {
  return api.get<{ sectors: Sector[] }>('/api/sectors');
}

export interface Project {
  id: string;
  ownerId: string;
  sectorId: string;
  sectorName: string;
  title: string;
  description: string | null;
  status: string;
  problemStatement: string | null;
  targetMarket: string | null;
  businessModel: string | null;
  fundingAmountSought: number | null;
  fundingUse: string | null;
  stage: string | null;
  legalStatus: string | null;
  country: string | null;
  teamSize: number | null;
  website: string | null;
  impactDescription: string | null;
  traction: string | null;
  registrationNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ProjectCreateInput = {
  sectorId: string;
  title: string;
  description?: string;
  problemStatement?: string;
  targetMarket?: string;
  businessModel?: string;
  fundingAmountSought?: number;
  fundingUse?: string;
  stage?: string;
  legalStatus?: string;
  country?: string;
  teamSize?: number;
  website?: string;
  impactDescription?: string;
  traction?: string;
  registrationNumber?: string;
};

export type ProjectUpdateInput = Partial<ProjectCreateInput> & { status?: string };

export async function getProjects(): Promise<{ projects: Project[] }> {
  return api.get<{ projects: Project[] }>('/api/projects');
}

export async function createProject(data: ProjectCreateInput): Promise<{ project: Project }> {
  return api.post<{ project: Project }>('/api/projects', data);
}

export async function getProject(id: string): Promise<{ project: Project }> {
  return api.get<{ project: Project }>(`/api/projects/${id}`);
}

export async function updateProject(id: string, data: ProjectUpdateInput): Promise<{ project: Project }> {
  return api.patch<{ project: Project }>(`/api/projects/${id}`, data);
}

export async function deleteProject(id: string): Promise<void> {
  return api.delete(`/api/projects/${id}`);
}

// ─── Admin (Admin role only)
export interface Opportunity {
  id: string;
  providerId: string;
  sectorId: string;
  sectorName: string;
  title: string;
  description: string | null;
  link: string | null;
  status: string;
  verifiedById: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getOpportunitiesPending(): Promise<{ opportunities: Opportunity[] }> {
  return api.get<{ opportunities: Opportunity[] }>('/api/opportunities/pending');
}

export async function verifyOpportunity(id: string, approve: boolean): Promise<{ opportunity: Opportunity }> {
  return api.patch<{ opportunity: Opportunity }>(`/api/opportunities/${id}/verify`, { approve });
}

/** Verified opportunities for entrepreneurs (optional sector filter). */
export async function getVerifiedOpportunities(sectorId?: string): Promise<{ opportunities: Opportunity[] }> {
  const q = sectorId ? `?sectorId=${encodeURIComponent(sectorId)}` : '';
  return api.get<{ opportunities: Opportunity[] }>(`/api/opportunities${q}`);
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export async function getAdminUsers(): Promise<{ users: AdminUser[] }> {
  return api.get<{ users: AdminUser[] }>('/api/admin/users');
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export async function getAuditLog(limit?: number): Promise<{ auditLog: AuditLogEntry[] }> {
  const q = limit != null ? `?limit=${limit}` : '';
  return api.get<{ auditLog: AuditLogEntry[] }>(`/api/admin/audit-log${q}`);
}

export interface VentureOverviewItem {
  id: string;
  title: string;
  sectorName: string;
  status: string;
  stage: string | null;
  country: string | null;
  createdAt: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  ownerRole: string;
}

export interface VenturesOverview {
  total: number;
  ventures: VentureOverviewItem[];
  byUser: { userId: string; email: string; name: string; role: string; count: number }[];
}

export async function getAdminVenturesOverview(): Promise<{ overview: VenturesOverview }> {
  return api.get<{ overview: VenturesOverview }>('/api/admin/ventures-overview');
}

// ─── Opportunity provider (serve entrepreneurs)
export async function getMyOpportunities(): Promise<{ opportunities: Opportunity[] }> {
  return api.get<{ opportunities: Opportunity[] }>('/api/opportunities/mine');
}

export type CreateOpportunityInput = {
  sectorId: string;
  title: string;
  description?: string;
  link?: string;
};

export async function createOpportunity(data: CreateOpportunityInput): Promise<{ opportunity: Opportunity }> {
  return api.post<{ opportunity: Opportunity }>('/api/opportunities', data);
}

export async function getProviderVenturesOverview(): Promise<{ overview: VenturesOverview }> {
  return api.get<{ overview: VenturesOverview }>('/api/provider/ventures-overview');
}
