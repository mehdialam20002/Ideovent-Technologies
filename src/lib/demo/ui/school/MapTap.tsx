/**
 * THE MAP THAT LOADS ONLY ON TAP. Before the tap it is a designed panel (no
 * third-party request, nothing heavy on a phone on mobile data): the address,
 * the landmark and two buttons, "Show the map here" and "Directions". The
 * embed is Google's keyless `output=embed` search view of the record's own
 * map query, built from the name and city when nothing else is typed.
 */

import { useState } from "react";
import { MapPin, Navigation } from "lucide-react";

export function MapTap({ query, directionsHref, labels, address }: {
  query: string;
  directionsHref: string;
  labels: { show: string; directions: string; title: string };
  address?: string[];
}) {
  const [on, setOn] = useState(false);
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  return (
    <div className="ds-card overflow-hidden p-0">
      {on ? (
        <iframe title={labels.title} src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="block aspect-[4/3] w-full border-0 sm:aspect-[16/9]" />
      ) : (
        <div className="relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-4 bg-[hsl(var(--ds-surface-2))] p-6 text-center sm:aspect-[16/9]">
          {/* A drawn street grid, so the panel reads as a map before it is one. */}
          <svg aria-hidden="true" className="absolute inset-0 h-full w-full text-[hsl(var(--ds-line))]" preserveAspectRatio="none" viewBox="0 0 400 300">
            <g stroke="currentColor" strokeWidth="6" fill="none">
              <path d="M0 90 L400 70" /><path d="M0 210 L400 230" /><path d="M120 0 L100 300" /><path d="M290 0 L310 300" />
            </g>
            <g stroke="currentColor" strokeWidth="2" fill="none" opacity="0.7">
              <path d="M0 150 L400 150" /><path d="M200 0 L205 300" /><path d="M40 0 L60 300" /><path d="M360 0 L350 300" />
            </g>
          </svg>
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--ds-brand))] text-[hsl(var(--ds-on-brand))] shadow-lg">
            <MapPin className="h-7 w-7" aria-hidden="true" />
          </span>
          {address && address.length > 0 && (
            <p className="relative max-w-sm rounded-[var(--ds-radius)] bg-[hsl(var(--ds-surface)/0.92)] px-3 py-2 text-sm font-medium text-[hsl(var(--ds-ink))]">{address.join(", ")}</p>
          )}
          <div className="relative flex flex-wrap justify-center gap-3">
            <button type="button" className="ds-btn ds-btn-brand" onClick={() => setOn(true)}>{labels.show}</button>
            <a className="ds-btn ds-btn-ghost bg-[hsl(var(--ds-surface))]" href={directionsHref} target="_blank" rel="noopener noreferrer">
              <Navigation className="h-4 w-4" aria-hidden="true" />{labels.directions}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
