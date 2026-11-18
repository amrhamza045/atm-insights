import { lazy } from "react";
import { isPosBusy, triggerUpdateIfSafe } from "@/lib/versionUpdate";

const RELOAD_GUARD_KEY = "rosemary_chunk_reload_at";
const RELOAD_COOLDOWN_MS = 15_000;

export function isModuleScriptError(error) {
  if (!error) return false;
  const msg = String(error?.message || error || "");
  return (
    error?.name === "ChunkLoadError" ||
    /importing a module script failed/i.test(msg) ||
    /failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /unable to preload css/i.test(msg) ||
    /loading (?:css )?chunk [\w-]+ failed/i.test(msg)
  );
}

export function recoverFromStaleChunk() {
  if (typeof window === "undefined" || isPosBusy()) return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
    if (last && Date.now() - last < RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  triggerUpdateIfSafe();
  return true;
}

export function installChunkErrorHandlers() {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", (event) => {
    if (recoverFromStaleChunk()) event.preventDefault();
  });
}

export function lazyWithRetry(importer) {
  return lazy(async () => {
    let lastError;
    for (const delayMs of [0, 250, 600]) {
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      try {
        const mod = await importer();
        try { sessionStorage.removeItem(RELOAD_GUARD_KEY); } catch {}
        return mod;
      } catch (err) {
        lastError = err;
        if (!isModuleScriptError(err)) throw err;
      }
    }
    if (recoverFromStaleChunk()) return new Promise(() => {});
    throw lastError;
  });
}