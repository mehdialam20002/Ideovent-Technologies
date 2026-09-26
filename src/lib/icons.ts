import type { LucideIcon } from "lucide-react";
import {
  Award, BarChart3, Blocks, Briefcase, Building2, Check, CheckCircle2, Circle, Clock, Cloud,
  Code, Compass, CreditCard, Database, FileText, Facebook, Figma, Flag, FolderKanban,
  FolderSearch, Gauge, Github, Globe, GraduationCap, Handshake, HeartHandshake, HelpCircle,
  Home, Inbox, Instagram, Layers, LayoutDashboard, LayoutGrid, LifeBuoy, Lightbulb,
  Link as LinkIcon, Linkedin, ListOrdered, Lock, Mail, MapPin, Megaphone, Menu, MessageCircle,
  Milestone, MonitorSmartphone, Newspaper, Palette, PenTool, Phone, Quote, Rocket, Scale,
  Search, Send, Server, Settings, Share2, Shield, ShoppingCart, Smartphone, Sparkles, Star,
  Target, Terminal, TrendingUp, Twitter, Users, Wrench, Youtube, Zap,
} from "lucide-react";

/**
 * Icon registry.
 *
 * This module used to be `import * as Icons from "lucide-react"` with a lookup by name.
 * That is a barrel import of ~1,500 icon modules: nothing tree-shakes, and it put
 * 789 KB of rendered JS, about 30% of the main chunk, on the critical path of every
 * visitor so that the homepage could draw roughly a dozen icons.
 *
 * Naming the icons explicitly lets Rollup keep only what is used. Every name below is
 * either referenced by `src/lib/cms/seed.ts` / `src/admin/schemas.ts` today, or is a
 * plausible choice for the kind of content this site holds, so an editor typing an icon
 * name into the CMS usually lands a hit.
 *
 * TO ADD AN ICON: import it above and add it to REGISTRY below. That is the whole job.
 * An unknown name renders a neutral Circle rather than silently pulling the entire icon
 * library down the wire, and says so in the dev console.
 */
const REGISTRY: Record<string, LucideIcon> = {
  Award, BarChart3, Blocks, Briefcase, Building2, Check, CheckCircle2, Circle, Clock, Cloud,
  Code, Compass, CreditCard, Database, FileText, Facebook, Figma, Flag, FolderKanban,
  FolderSearch, Gauge, Github, Globe, GraduationCap, Handshake, HeartHandshake, HelpCircle,
  Home, Inbox, Instagram, Layers, LayoutDashboard, LayoutGrid, LifeBuoy, Lightbulb,
  Link: LinkIcon, Linkedin, ListOrdered, Lock, Mail, MapPin, Megaphone, Menu, MessageCircle,
  Milestone, MonitorSmartphone, Newspaper, Palette, PenTool, Phone, Quote, Rocket, Scale,
  Search, Send, Server, Settings, Share2, Shield, ShoppingCart, Smartphone, Sparkles, Star,
  Target, Terminal, TrendingUp, Twitter, Users, Wrench, Youtube, Zap,
};

/** Every icon name this build can render: the admin can show these as valid choices. */
export const ICON_NAMES = Object.keys(REGISTRY).sort();

const warned = new Set<string>();

/** Resolve a lucide icon by its PascalCase name (as stored in the CMS). */
export function getIcon(name?: string): LucideIcon {
  if (!name) return Circle;
  const found = REGISTRY[name];
  if (found) return found;
  if (import.meta.env.DEV && !warned.has(name)) {
    warned.add(name);
    console.warn(`[icons] "${name}" is not in the registry, rendering Circle. Add it to src/lib/icons.ts.`);
  }
  return Circle;
}
