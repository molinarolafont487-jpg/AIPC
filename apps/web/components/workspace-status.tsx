"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CircleCheck, LogIn } from "lucide-react";
import { getMe, getSeedStatus, type MeResponse } from "@/lib/api-client";

type SeedStatus = {
  seeded: boolean;
  counts: Record<string, number>;
};

export function WorkspaceStatus() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [seed, setSeed] = useState<SeedStatus | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem("phantom.access_token");
    void getSeedStatus().then(setSeed).catch(() => setSeed(null));
    if (token) {
      void getMe(token).then(setMe).catch(() => setMe(null));
    }
  }, []);

  if (!me) {
    return (
      <Link
        className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1 text-sm text-slate-600 hover:border-accent hover:text-accent"
        href="/login"
      >
        <LogIn size={15} />
        登录演示账号
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
      <span className="inline-flex items-center gap-2 rounded-md bg-[#e9f6f5] px-3 py-1 text-accent">
        <CircleCheck size={15} />
        {me.workspace.name}
      </span>
      <span className="rounded-md border border-line px-3 py-1 text-slate-600">
        {me.user.name} / {me.user.role.name}
      </span>
      {seed?.seeded ? (
        <span className="rounded-md bg-mist px-3 py-1 text-slate-600">
          Seed {seed.counts.users}用户/{seed.counts.agents}Agent
        </span>
      ) : null}
    </div>
  );
}

