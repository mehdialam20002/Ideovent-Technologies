import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSingleton } from "@/lib/cms/context";
import { CtaButton } from "@/components/ui/cta-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Navbar() {
  const nav = useSingleton("navigation");
  const settings = useSingleton("settings");
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-300", scrolled ? "py-2.5" : "py-4")}>
      <div className="container-page">
        <nav
          className={cn(
            "flex items-center justify-between gap-4 rounded-full px-4 pl-5 transition-all duration-300",
            scrolled ? "h-14 border border-border/70 bg-background/70 backdrop-blur-xl shadow-lg shadow-black/5" : "h-16 border border-transparent"
          )}
        >
          <Link to="/" className="flex items-center gap-2.5" aria-label={settings.siteName}>
            <img src={settings.logo} alt="" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-display text-lg font-semibold tracking-tight">
              {settings.siteName.split(" ")[0]}
              <span className="text-primary">.</span>
            </span>
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {nav.header.items.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    isActive(item.href) ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive(item.href) && (
                    <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-muted" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <div className="hidden lg:block">
              <CtaButton cta={nav.header.cta} size="default" magnetic={false} />
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/60 lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="container-page lg:hidden"
          >
            <div className="mt-2 rounded-3xl border border-border bg-background/95 p-4 backdrop-blur-xl shadow-xl">
              <ul className="flex flex-col">
                {nav.header.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={cn(
                        "block rounded-2xl px-4 py-3 text-base font-medium transition-colors",
                        isActive(item.href) ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60"
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center gap-3 px-1">
                <CtaButton cta={nav.header.cta} size="lg" className="flex-1" magnetic={false} />
                <ThemeToggle />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
