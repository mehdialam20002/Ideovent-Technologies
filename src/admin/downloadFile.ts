/**
 * Saves text as a file from the browser (a Blob and a temporary link), so the
 * import templates need no server. Used by the Outreach Import tab and the
 * header's content Import.
 */
export function downloadText(filename: string, text: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked a second later: some browsers start the download after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
