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

export type CommandProtocol = {
  task_title: string;
  task_goal: string;
  task_type: string;
  primary_agent: string;
  collaborating_agents: string[];
  human_collaborators: string[];
  input_sources: string[];
  expected_outputs: string[];
  deadline: string;
  approval_required: boolean;
  risk_level: "low" | "medium" | "high";
  notification_channel: "飞书";
  archive_location: string;
  knowledge_refs?: KnowledgeReference[];
};

export type KnowledgeReference = {
  chunk_id: string;
  document_id: string;
  document_name: string;
  dataset: string;
  page_start: number;
  page_end: number;
  score: number;
  excerpt: string;
};

export type RoutingRules = Record<
  string,
  {
    primary_agent: string;
    collaborating_agents: string[];
    input_sources: string[];
    expected_outputs: string[];
    risk_level: "low" | "medium" | "high";
    keywords: string[];
  }
>;

export type Agent = {
  id: string;
  key: string;
  name: string;
  execution_mode: "real" | "semi_auto";
  description: string;
  tools: string[];
  status: string;
  prompt_config?: AgentRun["prompt_config"];
};

export type Task = {
  id: string;
  title: string;
  goal: string;
  type: string;
  status: string;
  command_protocol: CommandProtocol;
  primary_agent_id: string | null;
  approval_required: boolean;
  created_at: string;
  updated_at: string;
};

export type TaskEvent = {
  id: string;
  task_id: string;
  event_type: string;
  actor_type: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AgentRun = {
  id: string;
  task_id: string;
  agent_name: string;
  agent_key: string;
  execution_mode: "real" | "semi_auto";
  status: string;
  prompt_config: {
    role_description: string;
    duty_boundary: string;
    available_sources: string[];
    output_format: string[];
    forbidden: string[];
    requires_human_confirmation: boolean;
  };
  input_summary: {
    task_title: string;
    task_type: string;
    knowledge_ref_count: number;
  };
  output: string;
  artifacts: string[];
  created_at: string;
};

export type FeishuMessage = {
  id: string;
  task_id: string;
  channel: "feishu";
  direction: "outbound" | "inbound";
  sender: string;
  receiver: string;
  content: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type FeishuStatus = {
  channel: "feishu";
  mode: "mock" | "webhook";
  configured: boolean;
  message: string;
  counts: {
    sent: number;
    received: number;
    waiting_reply: number;
    failed: number;
  };
};

export type DocumentItem = {
  id: string;
  workspace_id?: string;
  name: string;
  file_type: string;
  dataset?: string;
  parse_status: string;
  chunk_count: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
};

export type DocumentChunk = {
  id: string;
  document_id: string;
  document_name: string;
  chunk_index: number;
  content: string;
  page_start: number;
  page_end: number;
  token_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
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

export async function listAgents() {
  const response = await fetch(`${API_BASE_URL}/api/v1/agents`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error("无法读取数字员工。");
  }
  return (await response.json()) as { items: Agent[]; total: number };
}

export async function parseCommand(input: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/commands/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input })
  });
  if (!response.ok) {
    throw new Error("命令解析失败。");
  }
  return (await response.json()) as { command_protocol: CommandProtocol };
}

export async function getRoutingRules() {
  const response = await fetch(`${API_BASE_URL}/api/v1/commands/routing-rules`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error("无法读取任务类型路由规则。");
  }
  return (await response.json()) as { items: RoutingRules };
}

export async function routeCommand(commandProtocol: CommandProtocol) {
  const response = await fetch(`${API_BASE_URL}/api/v1/commands/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command_protocol: commandProtocol })
  });
  if (!response.ok) {
    throw new Error("任务路由失败。");
  }
  return (await response.json()) as { command_protocol: CommandProtocol };
}

export async function createTask(commandProtocol: CommandProtocol) {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command_protocol: commandProtocol })
  });
  if (!response.ok) {
    throw new Error("任务创建失败。");
  }
  return (await response.json()) as {
    task_id: string;
    status: string;
    task: Task;
  };
}

export async function updateTaskProtocol(
  taskId: string,
  commandProtocol: CommandProtocol
) {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}/command-protocol`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command_protocol: commandProtocol })
  });
  if (!response.ok) {
    throw new Error("任务卡保存失败。");
  }
  return (await response.json()) as {
    task_id: string;
    status: string;
    task: Task;
  };
}

export async function confirmTask(taskId: string, comment?: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment })
  });
  if (!response.ok) {
    throw new Error("任务确认失败。");
  }
  return (await response.json()) as { task_id: string; status: string };
}

export async function startTask(taskId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}/start`, {
    method: "POST"
  });
  if (!response.ok) {
    throw new Error("任务启动失败。");
  }
  return (await response.json()) as {
    task_id: string;
    status: string;
    agent_runs: AgentRun[];
  };
}

export async function dispatchTaskAgents(taskId: string, force = false) {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}/dispatch-agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ force })
  });
  if (!response.ok) {
    throw new Error("数字员工执行失败。");
  }
  return (await response.json()) as { task_id: string; agent_runs: AgentRun[] };
}

export async function approveTask(taskId: string, comment?: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment })
  });
  if (!response.ok) {
    throw new Error("老板确认失败。");
  }
  return (await response.json()) as { task_id: string; status: string };
}

export async function archiveTask(taskId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}/archive`, {
    method: "POST"
  });
  if (!response.ok) {
    throw new Error("任务归档失败。");
  }
  return (await response.json()) as { task_id: string; status: string };
}

export async function listTasks() {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error("无法读取任务中心。");
  }
  return (await response.json()) as { items: Task[]; total: number };
}

export async function getTask(taskId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error("无法读取任务详情。");
  }
  return (await response.json()) as {
    task: Task;
    events: TaskEvent[];
    agent_runs: AgentRun[];
  };
}

export async function getFeishuStatus() {
  const response = await fetch(`${API_BASE_URL}/api/v1/integrations/feishu/status`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error("无法读取飞书集成状态。");
  }
  return (await response.json()) as FeishuStatus;
}

export async function listFeishuMessages() {
  const response = await fetch(`${API_BASE_URL}/api/v1/integrations/feishu/messages`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error("无法读取飞书消息。");
  }
  return (await response.json()) as { items: FeishuMessage[]; total: number };
}

export async function sendFeishuMessage(payload: {
  task_id: string;
  receiver?: string;
  content?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/integrations/feishu/send-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("飞书补充请求发送失败。");
  }
  return (await response.json()) as {
    ok: boolean;
    task_id: string;
    message: FeishuMessage;
  };
}

export async function simulateFeishuReply(payload: {
  task_id: string;
  sender?: string;
  content?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/integrations/feishu/simulate-reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("飞书回复回流失败。");
  }
  return (await response.json()) as {
    ok: boolean;
    task_id: string;
    message: FeishuMessage;
    agent_runs: AgentRun[];
    status: string;
  };
}

export async function listDocuments() {
  const response = await fetch(`${API_BASE_URL}/api/v1/documents`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error("无法读取知识库文档。");
  }
  return (await response.json()) as { items: DocumentItem[]; total: number };
}

export async function createDocument(payload: {
  filename: string;
  file_type: string;
  dataset: string;
  content: string;
  auto_ingest?: boolean;
}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("文档入库失败。");
  }
  return (await response.json()) as { document: DocumentItem };
}

export async function seedDemoDocuments(reset = true) {
  const response = await fetch(`${API_BASE_URL}/api/v1/documents/seed-demo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reset })
  });
  if (!response.ok) {
    throw new Error("Demo数据初始化失败。");
  }
  return (await response.json()) as {
    created: DocumentItem[];
    document_count: number;
    chunk_count: number;
  };
}

export async function listDocumentChunks(documentId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/documents/${documentId}/chunks`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error("无法读取文档分片。");
  }
  return (await response.json()) as { items: DocumentChunk[]; total: number };
}

export async function searchKnowledge(
  query: string,
  topK = 5,
  filters?: { dataset?: string }
) {
  const response = await fetch(`${API_BASE_URL}/api/v1/knowledge/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: topK, filters })
  });
  if (!response.ok) {
    throw new Error("知识库检索失败。");
  }
  return (await response.json()) as {
    answerable: boolean;
    query: string;
    chunks: KnowledgeReference[];
  };
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
