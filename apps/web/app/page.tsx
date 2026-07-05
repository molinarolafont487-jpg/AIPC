import { AppShell } from "@/components/app-shell";
import { CommandCenter } from "@/components/command-center";

export default function WorkbenchPage() {
  return (
    <AppShell
      title="AI指挥台"
      subtitle="老板一句话，六个数字员工与真人员工协同完成真实任务"
    >
      <CommandCenter />
    </AppShell>
  );
}
