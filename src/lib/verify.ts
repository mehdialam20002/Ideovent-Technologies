/** Public origin used for QR codes / verify links. Env override → runtime origin fallback. */
export function publicOrigin(): string {
  const env = import.meta.env.VITE_PUBLIC_URL as string | undefined;
  if (env) return env.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://ideovent.com";
}

export function verifyUrl(certificateId: string): string {
  return `${publicOrigin()}/verify/${certificateId}`;
}
