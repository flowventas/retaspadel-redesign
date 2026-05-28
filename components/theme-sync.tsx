"use client";

import { useEffect } from "react";
import { loadStore } from "@/lib/storage";

export function ThemeSync() {
  useEffect(() => {
    const store = loadStore();
    document.documentElement.classList.toggle("dark", store.theme === "dark");
  }, []);

  return null;
}
