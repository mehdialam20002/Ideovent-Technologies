import type { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import LeadPopupMount from "@/components/lead/LeadPopupMount";

/** Public site shell: smooth scroll + navbar + page content + footer. */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/*
        Skip link. The header is fixed and holds the logo, six nav links, a theme
        toggle and a CTA, so a keyboard or screen-reader user previously had to tab
        through 11-12 controls on every single route before reaching the page itself.
        This is the first thing in the tab order, invisible until focused, and jumps
        straight to <main>. tabIndex={-1} on <main> lets it actually take focus so the
        next Tab continues from the content rather than restarting at the top.
      */}
      <a
        href="#main"
        className="sr-only z-[100] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-full
                   focus:border focus:border-primary focus:bg-background focus:px-5 focus:py-3
                   focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>
      <SmoothScroll />
      <Navbar />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer />
      {/* The enquiry card (site:leads). Renders nothing until a minute of
          engaged reading has passed on a page where it may appear, then
          lazy-loads the card. Last in the DOM so it is last in the tab
          order and never ahead of the page's own content. */}
      <LeadPopupMount />
    </div>
  );
}
