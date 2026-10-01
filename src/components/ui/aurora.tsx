/**
 * The ambient brand wash that sat behind every hero: RETIRED, 1 Oct 2026.
 *
 * It was three 30-38rem circles blurred by 120-130px, tinted navy and gold,
 * rendered on 14 routes. Blurred colour blobs behind a headline are the most
 * recognisable flourish of a generated landing page ("aurora gradient
 * backgrounds" in the 2026 lists the hero brief collects, section 1 item 4),
 * and Mehdi's verdict on the page that carried them was "AI generated lag rha
 * hai, mujhe bilkul aisa nahi chahiye".
 *
 * It now renders nothing, so the pages that still place <Aurora /> need no
 * change and the heroes sit on the flat page ground (#F8FAFC light, navy
 * dark). The props are kept so no call site breaks. Do not bring the blobs
 * back; a hero gets its colour from real screenshots, not from blur.
 */
export function Aurora(_props: { className?: string }) {
  return null;
}
