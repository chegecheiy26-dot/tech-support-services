const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const SESSION_STORAGE_KEY = "tech-support-session-token";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

export function getSessionToken() {
  return localStorage.getItem(SESSION_STORAGE_KEY);
}

export function setSessionToken(token: string | null) {
  if (!token) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  localStorage.setItem(SESSION_STORAGE_KEY, token);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token = getSessionToken() } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Could not connect to the API. Make sure the backend is running or deployed correctly.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data as T;
}

export const api = {
  signUp(payload: { email: string; password: string; username: string; fullName: string }) {
    return request<{ token: string; user: { id: string; email: string }; profile: any }>("/auth/signup", {
      method: "POST",
      body: payload,
    });
  },
  signIn(payload: { email: string; password: string }) {
    return request<{ token: string; user: { id: string; email: string }; profile: any }>("/auth/signin", {
      method: "POST",
      body: payload,
    });
  },
  signOut() {
    return request<{ success: boolean }>("/auth/signout", { method: "POST" });
  },
  getMe() {
    return request<{ user: { id: string; email: string }; profile: any }>("/auth/me");
  },
  updatePassword(password: string) {
    return request<{ success: boolean }>("/auth/password", {
      method: "PATCH",
      body: { password },
    });
  },
  updateProfile(updates: Record<string, unknown>) {
    return request<{ profile: any }>("/profile", {
      method: "PATCH",
      body: updates,
    });
  },
  getConsultations() {
    return request<{ consultations: any[] }>("/consultations");
  },
  getAdminConsultations() {
    return request<{ consultations: any[]; ownerEmail: string }>("/admin/consultations");
  },
  createConsultation(payload: Record<string, unknown>) {
    return request<{ consultation: any }>("/consultations", {
      method: "POST",
      body: payload,
    });
  },
  updateConsultationStatus(id: string, status: string) {
    return request<{ consultation: any }>(`/admin/consultations/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
  },
  getSavedServices() {
    return request<{ savedServices: any[] }>("/saved-services");
  },
  saveService(payload: Record<string, unknown>) {
    return request<{ savedService: any }>("/saved-services", {
      method: "POST",
      body: payload,
    });
  },
  deleteSavedService(id: string) {
    return request<{ success: boolean }>(`/saved-services/${id}`, {
      method: "DELETE",
    });
  },
};
