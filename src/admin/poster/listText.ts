/*
 * LISTS ARE EDITED AS TEXT that round-trips exactly (split on a newline or a
 * comma, joined back with the same character), so typing "Physics, " does not
 * jump the caret. Blank lines and spaces are tidied once, on Create, by the
 * normaliser. Shared by the school and the clinic review forms; kept out of
 * ./ui.tsx so that file exports components only (fast refresh).
 */
export const lines = (l: string[] | undefined) => (l || []).join("\n");
export const unlines = (s: string) => (s ? s.split("\n") : []);
export const commas = (l: string[] | undefined) => (l || []).join(",");
export const uncommas = (s: string) => (s ? s.split(",") : []);
