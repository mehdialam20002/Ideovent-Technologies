/** Public base URL used for QR codes / verify links. Env override → runtime origin + base path. */
export function publicOrigin(): string {
  const env = import.meta.env.VITE_PUBLIC_URL as string | undefined;
  if (env) return env.replace(/\/$/, "");
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  if (typeof window !== "undefined") return `${window.location.origin}${base}`;
  return "https://ideovent.com";
}

export function verifyUrl(certificateId: string): string {
  return `${publicOrigin()}/verify/${certificateId}`;
}
