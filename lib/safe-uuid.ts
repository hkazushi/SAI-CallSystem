// crypto.randomUUID は Secure Context (HTTPS / localhost) でのみ利用可。
// 平文 HTTP では undefined になりうるので、フォールバックを用意する。
export function safeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isSecureContextAvailable(): boolean {
  if (typeof window === "undefined") return true;
  return window.isSecureContext === true;
}
