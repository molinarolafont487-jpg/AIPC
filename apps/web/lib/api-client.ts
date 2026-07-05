export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export type LoginResponse = {
  access_token: string;
  token_type: "bearer";
  user: {
    id: string;
    email: string;
    name: string;
    role: {
      id: string;
      key: string;
      name: string;
      permissions: string[];
    };
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
};

export type MeResponse = {
  user: LoginResponse["user"] & {
    membership: {
      id: string;
      display_name: string;
      feishu_user_id: string;
      status: string;
    };
  };
  workspace: LoginResponse["workspace"];
  permissions: string[];
};

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error("登录失败，请检查账号或密码。");
  }

  return (await response.json()) as LoginResponse;
}

export async function getMe(token?: string | null) {
  const response = await fetch(`${API_BASE_URL}/api/v1/me`, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`
        }
      : undefined,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("无法读取当前用户。");
  }

  return (await response.json()) as MeResponse;
}

export async function getSeedStatus() {
  const response = await fetch(`${API_BASE_URL}/api/v1/workspaces/current/seed`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("无法读取默认工作区 seed 状态。");
  }

  return (await response.json()) as {
    seeded: boolean;
    workspace: LoginResponse["workspace"];
    counts: Record<string, number>;
    demo_login: { email: string; password: string };
  };
}

