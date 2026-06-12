const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getToken() {
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Սխալ է տեղի ունեցել' }));
    throw new ApiError(data.error || 'Սխալ է տեղի ունեցել', res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function publicRequest<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Սխալ է տեղի ունեցել' }));
    throw new ApiError(data.error || 'Սխալ է տեղի ունեցել', res.status);
  }
  return res.json();
}

export const publicApi = {
  invitation: (token: string) => publicRequest<InvitationPreview>(`/public/invitations/${token}`),
};

export const api = {
  auth: {
    register: (data: { email: string; password: string; name: string }) =>
      request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request<User>('/auth/me'),
  },
  projects: {
    list: () => request<ProjectListItem[]>('/projects'),
    get: (id: string) => request<ProjectDetail>(`/projects/${id}`),
    create: (data: ProjectInput) => request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: ProjectInput) => request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/projects/${id}`, { method: 'DELETE' }),
    dashboard: (id: string) => request<DashboardData>(`/projects/${id}/dashboard`),
  },
  guests: {
    list: (projectId: string) => request<GuestsResponse>(`/projects/${projectId}/guests`),
    create: (projectId: string, data: GuestInput) =>
      request<Guest>(`/projects/${projectId}/guests`, { method: 'POST', body: JSON.stringify(data) }),
    update: (projectId: string, guestId: string, data: GuestInput) =>
      request<Guest>(`/projects/${projectId}/guests/${guestId}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (projectId: string, guestId: string) =>
      request(`/projects/${projectId}/guests/${guestId}`, { method: 'DELETE' }),
  },
  expenses: {
    list: (projectId: string) => request<ExpensesResponse>(`/projects/${projectId}/expenses`),
    create: (projectId: string, data: ExpenseInput) =>
      request<Expense>(`/projects/${projectId}/expenses`, { method: 'POST', body: JSON.stringify(data) }),
    update: (projectId: string, expenseId: string, data: ExpenseInput) =>
      request<Expense>(`/projects/${projectId}/expenses/${expenseId}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (projectId: string, expenseId: string) =>
      request(`/projects/${projectId}/expenses/${expenseId}`, { method: 'DELETE' }),
  },
  tables: {
    list: (projectId: string) => request<TablesResponse>(`/projects/${projectId}/tables`),
    create: (projectId: string, data: TableInput) =>
      request<SeatingTable>(`/projects/${projectId}/tables`, { method: 'POST', body: JSON.stringify(data) }),
    update: (projectId: string, tableId: string, data: TableInput) =>
      request<SeatingTable>(`/projects/${projectId}/tables/${tableId}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (projectId: string, tableId: string) =>
      request(`/projects/${projectId}/tables/${tableId}`, { method: 'DELETE' }),
    assign: (projectId: string, tableId: string, guestId: string) =>
      request(`/projects/${projectId}/tables/${tableId}/assign`, { method: 'POST', body: JSON.stringify({ guestId }) }),
    unassign: (projectId: string, tableId: string, guestId: string) =>
      request(`/projects/${projectId}/tables/${tableId}/guests/${guestId}`, { method: 'DELETE' }),
    autoDistribute: (projectId: string, data: { guestIds: string[]; peoplePerTable: number; tableNamePrefix?: string }) =>
      request(`/projects/${projectId}/tables/auto-distribute`, { method: 'POST', body: JSON.stringify(data) }),
  },
  invitations: {
    getTemplate: (projectId: string) => request<InvitationTemplate>(`/projects/${projectId}/invitations/template`),
    updateTemplate: (projectId: string, data: { template: string; backgroundImage?: string | null }) =>
      request<InvitationTemplate>(`/projects/${projectId}/invitations/template`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    preview: (projectId: string, guestId?: string) =>
      request<InvitationPreviewResponse>(
        `/projects/${projectId}/invitations/preview/${guestId || 'all'}`
      ),
  },
  schedule: {
    list: (projectId: string) => request<ScheduleItem[]>(`/projects/${projectId}/schedule`),
    create: (projectId: string, data: ScheduleInput) =>
      request<ScheduleItem>(`/projects/${projectId}/schedule`, { method: 'POST', body: JSON.stringify(data) }),
    update: (projectId: string, itemId: string, data: ScheduleInput) =>
      request<ScheduleItem>(`/projects/${projectId}/schedule/${itemId}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (projectId: string, itemId: string) =>
      request(`/projects/${projectId}/schedule/${itemId}`, { method: 'DELETE' }),
  },
  members: {
    list: (projectId: string) => request<MembersResponse>(`/projects/${projectId}/members`),
    invite: (projectId: string, data: { email: string; role: 'EDITOR' | 'VIEWER' }) =>
      request(`/projects/${projectId}/members/invite`, { method: 'POST', body: JSON.stringify(data) }),
    remove: (projectId: string, memberId: string) =>
      request(`/projects/${projectId}/members/${memberId}`, { method: 'DELETE' }),
  },
};

export { ApiError };

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface ProjectInput {
  brideName: string;
  groomName: string;
  weddingDate: string;
  totalBudget: number;
}

export interface Project {
  id: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  totalBudget: number;
}

export interface ProjectSummary {
  budget: { total: number; used: number; remaining: number; exceedsBudget: boolean };
  expenses: { total: number; paid: number; unpaid: number };
  guests: { total: number; confirmed: number; bride: number; groom: number };
  tables: { count: number; totalSeats: number; occupiedSeats: number; emptySeats: number; unassignedGuests: number };
  upcomingSchedule: { id: string; title: string; startTime: string; locationName: string }[];
}

export interface ProjectListItem extends Project {
  summary: ProjectSummary;
  userRole: string;
}

export interface ProjectDetail extends Project {
  summary: ProjectSummary;
  userRole: string;
  guests: Guest[];
  expenses: Expense[];
  tables: SeatingTable[];
  schedule: ScheduleItem[];
  invitation: InvitationTemplate | null;
  owner: User;
  members: { id: string; role: string; user: User }[];
}

export interface DashboardData {
  brideName: string;
  groomName: string;
  weddingDate: string;
  summary: ProjectSummary;
}

export interface GuestPartner {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  side: 'BRIDE' | 'GROOM';
  rsvp: string;
  notes?: string;
  partnerId?: string | null;
  partner?: GuestPartner | null;
  inviteToken: string;
}

export interface GuestInput {
  firstName: string;
  lastName: string;
  phone?: string;
  side: 'BRIDE' | 'GROOM';
  rsvp?: string;
  notes?: string;
  spouse?: Omit<GuestInput, 'side' | 'spouse'>;
}

export interface GuestsResponse {
  guests: Guest[];
  stats: { total: number; bride: number; groom: number };
}

export interface Expense {
  id: string;
  name: string;
  category: string;
  amount: number;
  paymentStatus: string;
  description?: string;
}

export interface ExpenseInput {
  name: string;
  category: string;
  amount: number;
  paymentStatus?: string;
  description?: string;
}

export interface ExpensesResponse {
  expenses: Expense[];
  stats: { total: number; paid: number; unpaid: number; remainingBudget: number; exceedsBudget: boolean };
}

export interface SeatingTable {
  id: string;
  name: string;
  capacity: number;
  guests: { id: string; guest: Guest }[];
}

export interface TableInput {
  name: string;
  capacity: number;
}

export interface TablesResponse {
  tables: SeatingTable[];
  unassignedGuests: Guest[];
  stats: { tableCount: number; totalSeats: number; occupiedSeats: number; emptySeats: number; unassignedCount: number };
}

export interface InvitationTemplate {
  id: string;
  template: string;
  backgroundImage?: string | null;
}

export interface InvitationPreview {
  guestId: string;
  guestName: string;
  partnerName?: string | null;
  inviteToken?: string;
  content: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  backgroundImage?: string | null;
  schedule?: InvitationScheduleItem[];
}

export interface InvitationScheduleItem {
  title: string;
  startTime: string;
  endTime?: string | null;
  locationName: string;
  address: string;
  mapLink?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface InvitationPreviewResponse {
  previews: InvitationPreview[];
  template: string;
  backgroundImage?: string | null;
}

export interface ScheduleItem {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  locationName: string;
  address: string;
  description?: string;
  mapLink?: string;
  latitude?: number;
  longitude?: number;
}

export interface ScheduleInput {
  title: string;
  startTime: string;
  endTime?: string | null;
  locationName: string;
  address: string;
  description?: string;
  mapLink?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface MembersResponse {
  owner: User & { role: string };
  members: { id: string; role: string; invitedAt: string; user: User }[];
}
