import { AppShell } from "@/components/app-shell";
import { ModelRouterPanel } from "@/components/model-router-panel";

export default function ModelRouterPage() {
  return (
    <AppShell
      title="模型调度后台"
      subtitle="查看本地/云端模型调用、成本、Token与调度比例"
    >
      <ModelRouterPanel />
    </AppShell>
  );
}
