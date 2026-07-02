/**
 * Ideovent CMS — content model.
 * Every user-facing string on the site is a field here so it can be edited from /admin.
 * The same shape is used by the local (seed + localStorage) store and the Supabase store.
 */

export type ID = string;

export interface Media {
  src: string;
  alt?: string;
}

export interface Cta {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
}

export interface SeoMeta {
  title?: string;
  description?: string;
  ogImage?: string;
  keywords?: string[];
}

export interface BaseDoc {
  id: ID;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

/* ───────────────── Singletons ───────────────── */

export interface SiteSettings {
  siteName: string;
  logo: string;
  favicon: string;
  tagline: string;
  defaultSeo: Required<Pick<SeoMeta, "title" | "description">> & {
    keywords: string[];
    ogImage: string;
    twitterHandle: string;
    canonicalHost: string;
  };
  analytics: { gaId?: string };
}

export interface ContactInfo {
  phoneDisplay: string;
  phoneHref: string;
  emailDisplay: string;
  emailHref: string;
  whatsappNumber: string;
  address: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  businessHours: string;
  responseTimePromise: string;
  mapEmbedUrl: string;
}

export interface SocialLink extends BaseDoc {
  platform: string;
  label: string;
  url: string;
  icon: string; // lucide icon name
}

export interface NavItem {
  label: string;
  href: string;
}
export interface FooterColumn {
  heading: string;
  links: NavItem[];
}
export interface Navigation {
  header: { items: NavItem[]; cta: Cta };
  footer: { tagline: string; columns: FooterColumn[] };
}

export interface HomeHero {
  badge: string;
  headingLines: { text: string; highlighted?: boolean }[];
  subheading: string;
  ctas: Cta[];
  socialProof: { line1: string; line2: string; avatars: Media[] };
  mainImage: Media;
  stat: { value: string; label: string };
}

export interface InternshipContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  batchLabel: string;
  certificatePreviewImage: string;
  benefits: { title: string; description: string; icon: string }[];
  curriculum: { week: string; title: string; description: string }[];
  terms: string[];
  pricing: { amount: string; label: string; note: string };
  paymentLink: string;
  checklist: string[];
}

export interface LegalContent {
  privacy: { title: string; updatedAt: string; body: string };
  terms: { title: string; updatedAt: string; body: string };
}

/* ───────────────── Collections ───────────────── */

export interface Service extends BaseDoc {
  title: string;
  slug: string;
  icon: string;
  shortDescription: string;
  longDescription: string;
  category: "Web" | "Design" | "Marketing" | "Mobile" | string;
  deliverables: string[];
  showOnHome: boolean;
  showInFooter: boolean;
}

export interface Testimonial extends BaseDoc {
  quote: string;
  authorName: string;
  authorPosition: string;
  authorCompany: string;
  authorPhoto: Media;
  rating: number;
  featured: boolean;
}

export interface ProjectResult {
  metric: string;
  label: string;
}
export interface Project extends BaseDoc {
  title: string;
  slug: string;
  category: string;
  clientName: string;
  summary: string;
  technologies: string[];
  challenge: string;
  solution: string;
  results: ProjectResult[];
  coverImage: string;
  gallery: Media[];
  liveUrl?: string;
  featured: boolean;
  body?: string;
}

export interface TeamMember extends BaseDoc {
  name: string;
  role: string;
  bio: string;
  photo: Media;
  socials: { platform: string; url: string; icon: string }[];
  visible: boolean;
}

export interface Milestone extends BaseDoc {
  year: string;
  title: string;
  description: string;
}

export interface ProcessStep extends BaseDoc {
  number: string;
  title: string;
  description: string;
}

export interface Faq extends BaseDoc {
  question: string;
  answer: string;
  category: "services" | "internship" | "general" | string;
}

export interface Stat extends BaseDoc {
  value: number;
  suffix: string;
  label: string;
}

export interface ClientLogo extends BaseDoc {
  name: string;
  logo: Media;
  url?: string;
}

export interface BlogPost extends BaseDoc {
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  body: string; // sanitized HTML
  author: string;
  publishDate: string;
  tags: string[];
  status: "draft" | "published";
  featured: boolean;
  seo?: SeoMeta;
}

export interface Certificate extends BaseDoc {
  certificateId: string; // e.g. INT2025A73
  internName: string;
  designation: string;
  issuedBy: string;
  duration: string;
  grade: string;
  location: string;
  projectWork: string;
  profileImage: string;
  certificateImage: string;
  status: "active" | "revoked";
  issuedAt: string;
}

export interface ContactSubmission extends BaseDoc {
  name: string;
  email: string;
  phone: string;
  message: string;
  sourcePage: string;
  status: "new" | "read" | "archived";
  receivedAt: string;
}

export interface Application extends BaseDoc {
  fullName: string;
  email: string;
  phone: string;
  college: string;
  stream: string;
  notes: string;
  paymentStatus: "pending" | "verified" | "failed";
  seatConfirmed: boolean;
  submittedAt: string;
}

/* ───────────────── Aggregate ───────────────── */

export interface ContentData {
  settings: SiteSettings;
  contact: ContactInfo;
  navigation: Navigation;
  home: HomeHero;
  internship: InternshipContent;
  legal: LegalContent;

  socials: SocialLink[];
  services: Service[];
  testimonials: Testimonial[];
  projects: Project[];
  team: TeamMember[];
  milestones: Milestone[];
  process: ProcessStep[];
  faqs: Faq[];
  stats: Stat[];
  clients: ClientLogo[];
  posts: BlogPost[];
  certificates: Certificate[];
  submissions: ContactSubmission[];
  applications: Application[];
}

/** Collections that are arrays of BaseDoc (CRUD-able). */
export type CollectionKey =
  | "socials" | "services" | "testimonials" | "projects" | "team"
  | "milestones" | "process" | "faqs" | "stats" | "clients"
  | "posts" | "certificates" | "submissions" | "applications";

/** Singletons (object edited in place). */
export type SingletonKey = "settings" | "contact" | "navigation" | "home" | "internship" | "legal";
