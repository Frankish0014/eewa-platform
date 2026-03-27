/**
 * API client — base URL from env, attaches JWT, handles 401.
 */
const API_BASE = import.meta.env.VITE_API_URL ?? '';

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

function apiUrl(path: string): string {
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}

/** One refresh at a time so parallel 401s do not race and spam /api/auth/refresh. */
let refreshInFlight: Promise<string> | null = null;

/** Opaque token — this browser is trusted until logout (then email OTP on next sign-in). */
export const DEVICE_TOKEN_STORAGE_KEY = 'eewa_device_token';

export function getDeviceToken(): string | null {
  return localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY);
}

export function setDeviceToken(token: string): void {
  localStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, token);
}

export function clearDeviceToken(): void {
  localStorage.removeItem(DEVICE_TOKEN_STORAGE_KEY);
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
  deviceToken: string;
}

export type LoginResult = LoginResponse | { requiresEmailOtp: true; emailOtpToken: string };

export interface MeResponse {
  user: User;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const url = apiUrl(path);
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
    const hasRefresh = !!localStorage.getItem('refreshToken');
    if (
      hasRefresh &&
      !isRetry &&
      path !== '/api/auth/refresh' &&
      path !== '/api/auth/login' &&
      path !== '/api/auth/register' &&
      path !== '/api/auth/verify-email-otp'
    ) {
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
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      details?: { fieldErrors?: Record<string, string[] | undefined> };
    };
    let msg = err.error ?? `HTTP ${res.status}`;
    const fe = err.details?.fieldErrors;
    if (fe && typeof fe === 'object') {
      const first = Object.values(fe).flat().filter(Boolean)[0];
      if (typeof first === 'string') msg = `${msg}: ${first}`;
    }
    throw new Error(msg);
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }
  const text = await res.text();
  if (!text.trim()) {
    return undefined as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid response from server (HTTP ${res.status})`);
  }
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
  institutionName?: string;
  institutionCountry?: string;
}): Promise<LoginResponse> {
  const data = await api.post<LoginResponse>('/api/auth/register', input);
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  if (data.deviceToken) setDeviceToken(data.deviceToken);
  return data;
}

async function publicPost<T>(path: string, body: unknown): Promise<T> {
  const url = apiUrl(path);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const deviceToken = getDeviceToken();
  const data = await publicPost<LoginResult>('/api/auth/login', {
    email,
    password,
    ...(deviceToken ? { deviceToken } : {}),
  });
  if ('requiresEmailOtp' in data && data.requiresEmailOtp) {
    return data;
  }
  const lr = data as LoginResponse;
  localStorage.setItem('accessToken', lr.accessToken);
  localStorage.setItem('refreshToken', lr.refreshToken);
  if (lr.deviceToken) setDeviceToken(lr.deviceToken);
  return lr;
}

export async function completeLoginWithEmailOtp(emailOtpToken: string, code: string): Promise<LoginResponse> {
  const data = await publicPost<LoginResponse>('/api/auth/verify-email-otp', { emailOtpToken, code });
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  if (data.deviceToken) setDeviceToken(data.deviceToken);
  return data;
}

export async function refreshToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;
  const run = (async () => {
    const refresh = localStorage.getItem('refreshToken');
    if (!refresh) throw new Error('No refresh token');
    const res = await fetch(apiUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    const data = (await res.json()) as { accessToken: string };
    localStorage.setItem('accessToken', data.accessToken);
    return data.accessToken;
  })();
  refreshInFlight = run;
  try {
    return await run;
  } finally {
    refreshInFlight = null;
  }
}

export function logout(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  clearDeviceToken();
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
  skills: string | null;
  /** When true, new browsers/devices require email code after password. */
  emailSignInOtpEnabled: boolean;
  institutionName?: string;
  institutionCountry?: string;
  createdAt: string;
}

export async function getProfile(): Promise<{ profile: Profile }> {
  return api.get<{ profile: Profile }>('/api/profile');
}

export async function updateProfile(data: {
  firstName?: string;
  lastName?: string;
  skills?: string | null;
  emailSignInOtpEnabled?: boolean;
  currentPassword?: string;
}): Promise<{ profile: Profile }> {
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

// ─── Mentor profile (Mentor role only — set sectors/categories you mentor in)
export interface MentorProfileDto {
  id: string;
  userId: string;
  bio: string | null;
  maxMentees: number;
  isActive: boolean;
  sectorIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type MentorProfileUpdateInput = {
  bio?: string;
  maxMentees?: number;
  isActive?: boolean;
  sectorIds?: string[];
};

export async function getMentorProfile(): Promise<{ profile: MentorProfileDto }> {
  return api.get<{ profile: MentorProfileDto }>('/api/mentor/profile');
}

export async function updateMentorProfile(data: MentorProfileUpdateInput): Promise<{ profile: MentorProfileDto }> {
  return api.patch<{ profile: MentorProfileDto }>('/api/mentor/profile', data);
}

// ─── Mentors (find and request)
export interface MentorListItem {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  bio: string | null;
  maxMentees: number;
  isActive: boolean;
  sectorIds: string[];
  sectorNames: string[];
}

export async function getMentorsBySector(sectorId: string): Promise<{ mentors: MentorListItem[] }> {
  return api.get<{ mentors: MentorListItem[] }>(`/api/mentors?sectorId=${encodeURIComponent(sectorId)}`);
}

export async function requestMentorForProject(projectId: string, mentorId: string): Promise<{ id: string }> {
  return api.post<{ id: string }>(`/api/projects/${projectId}/mentor-requests`, { mentorId });
}

export interface MentorRequestItem {
  id: string;
  projectId: string;
  projectTitle: string;
  menteeId: string;
  menteeName: string;
  status: string;
  assignedAt: string;
}

export async function getMentorRequests(): Promise<{ requests: MentorRequestItem[] }> {
  return api.get<{ requests: MentorRequestItem[] }>('/api/mentor/requests');
}

export async function respondToMentorRequest(assignmentId: string, accept: boolean): Promise<void> {
  return api.patch<void>(`/api/mentor/requests/${assignmentId}`, { accept });
}

// ─── In-app notifications
export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  readAt: string | null;
  createdAt: string;
}

export async function getNotifications(): Promise<{ notifications: NotificationItem[] }> {
  return api.get<{ notifications: NotificationItem[] }>('/api/notifications');
}

export async function markNotificationRead(id: string): Promise<void> {
  return api.patch<void>(`/api/notifications/${id}/read`, {});
}

export async function markAllNotificationsRead(): Promise<void> {
  return api.post<void>('/api/notifications/read-all', {});
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
  eligibilityCriteria: string | null;
  requireCompletedMilestone: boolean;
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
  eligibilityCriteria?: string;
  requireCompletedMilestone?: boolean;
};

export async function createOpportunity(data: CreateOpportunityInput): Promise<{ opportunity: Opportunity }> {
  return api.post<{ opportunity: Opportunity }>('/api/opportunities', data);
}

export type UpdateOpportunityInput = {
  sectorId?: string;
  title?: string;
  description?: string;
  link?: string;
  eligibilityCriteria?: string;
  requireCompletedMilestone?: boolean;
};

export type VentureStageOption = 'IDEA' | 'PROTOTYPE' | 'MVP' | 'REVENUE' | 'SCALING' | 'OTHER';

export interface OpportunityApplication {
  id: string;
  opportunityId: string;
  studentId: string;
  primaryProjectId: string | null;
  message: string | null;
  whyFit: string | null;
  experienceSummary: string | null;
  outcomesSought: string | null;
  supportNeeded: string | null;
  ventureStage: string | null;
  proofSummary: string | null;
  proofLinks: string | null;
  createdAt: string;
}

export interface OpportunityApplicationListItem extends OpportunityApplication {
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
  primaryProjectTitle: string | null;
}

export async function applyToOpportunity(
  opportunityId: string,
  body: {
    primaryProjectId?: string;
    message?: string;
    eligibilityAcknowledged?: boolean;
    whyFit: string;
    experienceSummary?: string;
    outcomesSought?: string;
    supportNeeded?: string;
    ventureStage?: VentureStageOption;
    proofSummary?: string;
    proofLinks?: string;
  }
): Promise<{ application: OpportunityApplication }> {
  return api.post<{ application: OpportunityApplication }>(`/api/opportunities/${opportunityId}/apply`, body);
}

export async function getOpportunityApplications(
  opportunityId: string
): Promise<{ applications: OpportunityApplicationListItem[] }> {
  return api.get<{ applications: OpportunityApplicationListItem[] }>(
    `/api/opportunities/${opportunityId}/applications`
  );
}

export async function updateOpportunity(id: string, data: UpdateOpportunityInput): Promise<{ opportunity: Opportunity }> {
  return api.patch<{ opportunity: Opportunity }>(`/api/opportunities/${id}`, data);
}

export async function getProviderVenturesOverview(): Promise<{ overview: VenturesOverview }> {
  return api.get<{ overview: VenturesOverview }>('/api/provider/ventures-overview');
}

// ─── Messaging (mentor ↔ student, active mentorship)
export interface MessagingPeer {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  projectId: string;
  projectTitle: string;
  assignmentId: string;
}

export async function getMessagingEligiblePeers(): Promise<{ peers: MessagingPeer[] }> {
  return api.get<{ peers: MessagingPeer[] }>('/api/messages/eligible-peers');
}

export interface ConversationSummary {
  id: string;
  peer: { id: string; firstName: string; lastName: string; email: string };
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export async function getConversations(): Promise<{ conversations: ConversationSummary[] }> {
  return api.get<{ conversations: ConversationSummary[] }>('/api/conversations');
}

export async function openConversation(peerUserId: string): Promise<{ conversationId: string }> {
  return api.post<{ conversationId: string }>('/api/conversations', { peerUserId });
}

export interface ThreadMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export async function getConversationMessages(
  conversationId: string,
  opts?: { limit?: number; before?: string }
): Promise<{ messages: ThreadMessage[] }> {
  const params = new URLSearchParams();
  if (opts?.limit != null) params.set('limit', String(opts.limit));
  if (opts?.before) params.set('before', opts.before);
  const q = params.toString();
  return api.get<{ messages: ThreadMessage[] }>(`/api/conversations/${conversationId}/messages${q ? `?${q}` : ''}`);
}

export async function sendConversationMessage(
  conversationId: string,
  body: string
): Promise<{ message: ThreadMessage }> {
  return api.post<{ message: ThreadMessage }>(`/api/conversations/${conversationId}/messages`, { body });
}
