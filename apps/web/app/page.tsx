import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Play,
  Send,
  Sparkles
} from "lucide-react";
import { agents, navItems, stats, taskFields, timeline } from "@/lib/demo-data";

const command =
  "帮我准备明天下午给华星科技的合作方案，让销售小张补充预算，销售助理生成话术，内容助理生成PPT大纲。";

export default function WorkbenchPage() {
  return (
    <main className="min-h-screen bg-[#f6f8fa] text-ink">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[252px_1fr]">
        <aside className="border-b border-line bg-white px-4 py-5 lg:border-b-0 lg:border-r">
          <div className="mb-7 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="text-sm font-semibold">Phantom</div>
              <div className="text-xs text-slate-500">AI Workstation</div>
            </div>
          </div>

          <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:block lg:space-y-1">
            {navItems.map((item) => (
              <button
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                  item.active
                    ? "bg-ink text-white"
                    : "text-slate-600 hover:bg-mist hover:text-ink"
                }`}
                key={item.label}
              >
                <item.icon size={17} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-6 py-3">
            <div>
              <h1 className="text-lg font-semibold">AI指挥台</h1>
              <p className="text-xs text-slate-500">
                老板一句话，六个数字员工与真人员工协同完成真实任务
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="rounded-md border border-line px-3 py-1 text-slate-600">
                飞书已选
              </span>
              <span className="rounded-md bg-[#e9f6f5] px-3 py-1 text-accent">
                3个真执行Agent
              </span>
            </div>
          </header>

          <div className="grid flex-1 grid-cols-1 gap-5 p-5 xl:grid-cols-[1fr_360px]">
            <div className="space-y-5">
              <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">自然语言指挥</h2>
                    <p className="text-sm text-slate-500">
                      告诉六个数字员工，你想完成什么。
                    </p>
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">
                    <Play size={16} />
                    生成任务卡
                  </button>
                </div>

                <div className="rounded-md border border-line bg-[#fbfcfd] p-4">
                  <p className="min-h-16 text-sm leading-6 text-slate-700">
                    {command}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    "准备客户方案",
                    "整理会议纪要",
                    "生成PPT大纲",
                    "拆解任务",
                    "查询资料",
                    "生成代码原型"
                  ].map((label) => (
                    <button
                      className="rounded-md border border-line px-3 py-1.5 text-xs text-slate-600 hover:border-accent hover:text-accent"
                      key={label}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    className="rounded-lg border border-line bg-white p-4"
                    key={stat.label}
                  >
                    <div className="mb-3 flex items-center justify-between text-slate-500">
                      <span className="text-xs">{stat.label}</span>
                      <stat.icon size={16} />
                    </div>
                    <div className="text-2xl font-semibold">{stat.value}</div>
                  </div>
                ))}
              </section>

              <section className="rounded-lg border border-line bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold">六个数字员工</h2>
                  <span className="text-xs text-slate-500">
                    真执行优先：销售、知识库、老板助理
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {agents.map((agent) => (
                    <article
                      className="rounded-md border border-line p-4"
                      key={agent.name}
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-semibold">
                            {agent.name}
                          </h3>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {agent.task}
                          </p>
                        </div>
                        <span
                          className={`rounded px-2 py-1 text-[11px] ${
                            agent.status === "真执行"
                              ? "bg-[#e9f6f5] text-accent"
                              : "bg-mist text-slate-500"
                          }`}
                        >
                          {agent.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        当前：{agent.progress}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-5">
              <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold">任务卡</h2>
                  <span className="rounded bg-[#fff6e8] px-2 py-1 text-xs text-amber">
                    待确认
                  </span>
                </div>

                <div className="space-y-3">
                  {taskFields.map(([label, value]) => (
                    <div
                      className="grid grid-cols-[88px_1fr] gap-3 text-sm"
                      key={label}
                    >
                      <div className="text-xs text-slate-500">{label}</div>
                      <div className="leading-5 text-slate-700">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-sm text-white">
                    确认执行
                    <ArrowRight size={15} />
                  </button>
                  <button className="rounded-md border border-line px-3 py-2 text-sm text-slate-600">
                    修改任务
                  </button>
                </div>
              </section>

              <section className="rounded-lg border border-line bg-white p-5">
                <h2 className="mb-4 text-base font-semibold">任务中心流转</h2>
                <div className="space-y-4">
                  {timeline.map((item) => (
                    <div className="flex gap-3" key={item.label}>
                      <div
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          item.done
                            ? "bg-[#e9f6f5] text-accent"
                            : "bg-mist text-slate-400"
                        }`}
                      >
                        {item.done ? (
                          <CheckCircle2 size={15} />
                        ) : (
                          <Clock3 size={15} />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="text-xs leading-5 text-slate-500">
                          {item.detail}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-line bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <MessageCircle size={17} className="text-accent" />
                  <h2 className="text-base font-semibold">飞书协同</h2>
                </div>
                <div className="rounded-md bg-mist p-3 text-sm leading-6 text-slate-700">
                  <p>销售助理请求销售小张补充华星科技预算。</p>
                  <p className="mt-2 text-xs text-slate-500">
                    回复回流后，任务将从等待真人补充切回执行中。
                  </p>
                </div>
                <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-700">
                  <Send size={15} />
                  发送飞书请求
                </button>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
