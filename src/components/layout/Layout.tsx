import type { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { SmoothScroll } from "@/components/motion/SmoothScroll";

/** Public site shell: smooth scroll + navbar + page content + footer. */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <SmoothScroll />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
