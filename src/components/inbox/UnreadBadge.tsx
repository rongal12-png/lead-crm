"use client";

import { useEffect, useState } from "react";

export default function UnreadBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/inbox/unread");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setCount(json.data?.totalUnread ?? 0);
      } catch {
        // silent
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-500 text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}
