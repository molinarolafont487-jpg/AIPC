"use client";

import { useEffect, useState } from "react";
import { Clock3, RefreshCcw } from "lucide-react";
import { getTask, listTasks, type Task, type TaskEvent } from "@/lib/api-client";

const statusLabels: Record<string, string> = {
  pending_confirm: "待确认",
  running: "执行中",
  waiting_human: "等待真人员工补充",
  waiting_approval: "等待老板确认",
  completed: "已完成",
  archived: "已归档",
  failed: "失败",
  canceled: "已取消"
};

export function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [message, setMessage] = useState("任务中心会显示AI指挥台创建的任务。");

  async function loadTasks() {
    const result = await listTasks();
    setTasks(result.items);
    if (result.items[0]) {
      const detail = await getTask(result.items[0].id);
      setSelectedTask(detail.task);
      setEvents(detail.events);
    } else {
      setSelectedTask(null);
      setEvents([]);
    }
    setMessage(`已加载 ${result.total} 个任务。`);
  }

  useEffect(() => {
    void loadTasks().catch((error) =>
      setMessage(error instanceof Error ? error.message : "任务读取失败。")
    );
  }, []);

  async function selectTask(taskId: string) {
    const detail = await getTask(taskId);
    setSelectedTask(detail.task);
    setEvents(detail.events);
  }

  return (
    <div className="grid gap-5 p-5 xl:grid-cols-[420px_1fr]">
      <section className="rounded-lg border border-line bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">任务列表</h2>
            <p className="text-sm text-slate-500">{message}</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-700"
            onClick={() => void loadTasks()}
          >
            <RefreshCcw size={15} />
            刷新
          </button>
        </div>

        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="rounded-md bg-mist p-4 text-sm leading-6 text-slate-600">
              暂无任务。请先回到 AI指挥台，点击“生成任务卡”并“确认执行”。
            </div>
          ) : (
            tasks.map((task) => (
              <button
                className={`w-full rounded-md border p-4 text-left ${
                  selectedTask?.id === task.id
                    ? "border-accent bg-[#e9f6f5]"
                    : "border-line bg-white hover:bg-mist"
                }`}
                key={task.id}
                onClick={() => void selectTask(task.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{task.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{task.goal}</div>
                  </div>
                  <span className="shrink-0 rounded bg-mist px-2 py-1 text-xs text-slate-600">
                    {statusLabels[task.status] || task.status}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-4 text-base font-semibold">任务详情与时间线</h2>
        {selectedTask ? (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["任务类型", selectedTask.type],
                ["状态", statusLabels[selectedTask.status] || selectedTask.status],
                ["主责Agent", selectedTask.command_protocol.primary_agent],
                ["协作真人", selectedTask.command_protocol.human_collaborators.join("、")]
              ].map(([label, value]) => (
                <div className="rounded-md bg-mist p-3" key={label}>
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="mt-1 text-sm font-medium">{value || "暂无"}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {events.map((event) => (
                <div className="flex gap-3 rounded-md border border-line p-3" key={event.id}>
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e9f6f5] text-accent">
                    <Clock3 size={15} />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{event.message}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {event.event_type} / {event.created_at}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-md bg-mist p-4 text-sm text-slate-600">
            选择一个任务后查看时间线。
          </div>
        )}
      </section>
    </div>
  );
}

