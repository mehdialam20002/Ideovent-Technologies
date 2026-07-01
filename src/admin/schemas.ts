import type { FieldConfig } from "./fields";
import type { CollectionKey, SingletonKey } from "@/lib/cms/types";
import { nextId } from "@/lib/cms/store";

export interface CollectionSchema {
  label: string;
  singular: string;
  icon: string;
  titleField: string;
  subtitleField?: string;
  imageField?: string;
  fields: FieldConfig[];
  defaults: () => Record<string, any>;
}

export interface SingletonSchema {
  label: string;
  icon: string;
  fields: FieldConfig[];
}

const mediaFields: FieldConfig[] = [
  { name: "src", label: "Image", type: "image", full: true },
  { name: "alt", label: "Alt text", type: "text" },
];

export const collectionSchemas: Partial<Record<CollectionKey, CollectionSchema>> = {
  services: {
    label: "Services", singular: "Service", icon: "LayoutGrid", titleField: "title", subtitleField: "shortDescription",
    defaults: () => ({ id: nextId("svc"), title: "", slug: "", icon: "Code", category: "Web", shortDescription: "", longDescription: "", deliverables: [], showOnHome: true, showInFooter: true }),
    fields: [
      { name: "title", label: "Title", type: "text", full: true },
      { name: "slug", label: "Slug", type: "text", help: "URL: /services/slug" },
      { name: "icon", label: "Lucide icon name", type: "text", placeholder: "Code, PenTool, Globe…" },
      { name: "category", label: "Category", type: "select", options: ["Web", "Design", "Marketing", "Mobile"].map((v) => ({ label: v, value: v })) },
      { name: "shortDescription", label: "Short description (card)", type: "textarea", full: true },
      { name: "longDescription", label: "Long description", type: "textarea", full: true },
      { name: "deliverables", label: "Deliverables", type: "stringlist", full: true },
      { name: "showOnHome", label: "Show on home", type: "boolean" },
      { name: "showInFooter", label: "Show in footer", type: "boolean" },
    ],
  },
  projects: {
    label: "Projects", singular: "Project", icon: "FolderKanban", titleField: "title", subtitleField: "clientName", imageField: "coverImage",
    defaults: () => ({ id: nextId("prj"), title: "", slug: "", category: "web", clientName: "", summary: "", technologies: [], challenge: "", solution: "", results: [], coverImage: "", gallery: [], liveUrl: "", featured: false, body: "" }),
    fields: [
      { name: "title", label: "Title", type: "text", full: true },
      { name: "slug", label: "Slug", type: "text" },
      { name: "category", label: "Category", type: "text", placeholder: "web, mobile, design, product…" },
      { name: "clientName", label: "Client", type: "text" },
      { name: "liveUrl", label: "Live URL", type: "text" },
      { name: "featured", label: "Featured", type: "boolean" },
      { name: "coverImage", label: "Cover image", type: "image", full: true },
      { name: "summary", label: "Summary", type: "textarea", full: true },
      { name: "technologies", label: "Technologies", type: "tags", full: true },
      { name: "challenge", label: "Challenge", type: "textarea", full: true },
      { name: "solution", label: "Solution", type: "textarea", full: true },
      { name: "results", label: "Results", type: "array", full: true, itemFields: [
        { name: "metric", label: "Metric", type: "text" }, { name: "label", label: "Label", type: "text" },
      ] },
      { name: "gallery", label: "Gallery", type: "array", full: true, itemFields: mediaFields },
    ],
  },
  testimonials: {
    label: "Testimonials", singular: "Testimonial", icon: "Quote", titleField: "authorName", subtitleField: "authorCompany",
    defaults: () => ({ id: nextId("tst"), quote: "", authorName: "", authorPosition: "", authorCompany: "", authorPhoto: { src: "", alt: "" }, rating: 5, featured: true }),
    fields: [
      { name: "quote", label: "Quote", type: "textarea", full: true },
      { name: "authorName", label: "Author name", type: "text" },
      { name: "authorPosition", label: "Position", type: "text" },
      { name: "authorCompany", label: "Company", type: "text" },
      { name: "rating", label: "Rating (1-5)", type: "number" },
      { name: "featured", label: "Featured", type: "boolean" },
      { name: "authorPhoto", label: "Photo", type: "group", full: true, fields: mediaFields },
    ],
  },
  team: {
    label: "Team", singular: "Member", icon: "Users", titleField: "name", subtitleField: "role", imageField: "photo",
    defaults: () => ({ id: nextId("tm"), name: "", role: "", bio: "", photo: { src: "", alt: "" }, socials: [], visible: true }),
    fields: [
      { name: "name", label: "Name", type: "text" },
      { name: "role", label: "Role", type: "text" },
      { name: "visible", label: "Visible", type: "boolean" },
      { name: "bio", label: "Bio", type: "textarea", full: true },
      { name: "photo", label: "Photo", type: "group", full: true, fields: mediaFields },
      { name: "socials", label: "Socials", type: "array", full: true, itemFields: [
        { name: "platform", label: "Platform", type: "text" }, { name: "url", label: "URL", type: "text" }, { name: "icon", label: "Icon", type: "text" },
      ] },
    ],
  },
  milestones: {
    label: "Milestones", singular: "Milestone", icon: "Milestone", titleField: "title", subtitleField: "year",
    defaults: () => ({ id: nextId("ms"), year: "", title: "", description: "" }),
    fields: [
      { name: "year", label: "Year", type: "text" },
      { name: "title", label: "Title", type: "text" },
      { name: "description", label: "Description", type: "textarea", full: true },
    ],
  },
  process: {
    label: "Process", singular: "Step", icon: "ListOrdered", titleField: "title", subtitleField: "number",
    defaults: () => ({ id: nextId("ps"), number: "", title: "", description: "" }),
    fields: [
      { name: "number", label: "Number", type: "text", placeholder: "01" },
      { name: "title", label: "Title", type: "text" },
      { name: "description", label: "Description", type: "textarea", full: true },
    ],
  },
  faqs: {
    label: "FAQs", singular: "FAQ", icon: "HelpCircle", titleField: "question", subtitleField: "category",
    defaults: () => ({ id: nextId("faq"), question: "", answer: "", category: "services" }),
    fields: [
      { name: "question", label: "Question", type: "text", full: true },
      { name: "answer", label: "Answer", type: "textarea", full: true },
      { name: "category", label: "Category", type: "select", options: ["services", "internship", "general"].map((v) => ({ label: v, value: v })) },
    ],
  },
  stats: {
    label: "Stats", singular: "Stat", icon: "BarChart3", titleField: "label", subtitleField: "value",
    defaults: () => ({ id: nextId("st"), value: 0, suffix: "", label: "" }),
    fields: [
      { name: "value", label: "Value", type: "number" },
      { name: "suffix", label: "Suffix", type: "text", placeholder: "%, +, h" },
      { name: "label", label: "Label", type: "text", full: true },
    ],
  },
  clients: {
    label: "Clients", singular: "Client", icon: "Building2", titleField: "name", imageField: "logo",
    defaults: () => ({ id: nextId("cl"), name: "", logo: { src: "", alt: "" }, url: "" }),
    fields: [
      { name: "name", label: "Name", type: "text" },
      { name: "url", label: "URL", type: "text" },
      { name: "logo", label: "Logo", type: "group", full: true, fields: mediaFields },
    ],
  },
  socials: {
    label: "Social Links", singular: "Link", icon: "Share2", titleField: "label", subtitleField: "url",
    defaults: () => ({ id: nextId("soc"), platform: "", label: "", url: "", icon: "Link" }),
    fields: [
      { name: "label", label: "Label", type: "text" },
      { name: "platform", label: "Platform", type: "text" },
      { name: "icon", label: "Lucide icon", type: "text", placeholder: "Linkedin, Instagram…" },
      { name: "url", label: "URL", type: "text", full: true },
    ],
  },
  posts: {
    label: "Blog Posts", singular: "Post", icon: "Newspaper", titleField: "title", subtitleField: "author", imageField: "coverImage",
    defaults: () => ({ id: nextId("post"), title: "", slug: "", excerpt: "", coverImage: "", body: "<p></p>", author: "Ideovent Team", publishDate: new Date().toISOString().slice(0, 10), tags: [], status: "published", featured: false }),
    fields: [
      { name: "title", label: "Title", type: "text", full: true },
      { name: "slug", label: "Slug", type: "text" },
      { name: "status", label: "Status", type: "select", options: ["published", "draft"].map((v) => ({ label: v, value: v })) },
      { name: "author", label: "Author", type: "text" },
      { name: "publishDate", label: "Publish date", type: "text", placeholder: "YYYY-MM-DD" },
      { name: "featured", label: "Featured", type: "boolean" },
      { name: "coverImage", label: "Cover image", type: "image", full: true },
      { name: "excerpt", label: "Excerpt", type: "textarea", full: true },
      { name: "tags", label: "Tags", type: "tags", full: true },
      { name: "body", label: "Body (HTML)", type: "richtext", full: true, help: "HTML is allowed and sanitized on render." },
    ],
  },
};

export const singletonSchemas: Record<SingletonKey, SingletonSchema> = {
  settings: {
    label: "Site Settings", icon: "Settings",
    fields: [
      { name: "siteName", label: "Site name", type: "text" },
      { name: "tagline", label: "Tagline", type: "text" },
      { name: "logo", label: "Logo", type: "image", full: true },
      { name: "favicon", label: "Favicon", type: "text" },
      { name: "defaultSeo", label: "Default SEO", type: "group", full: true, fields: [
        { name: "title", label: "Default title", type: "text", full: true },
        { name: "description", label: "Default description", type: "textarea", full: true },
        { name: "keywords", label: "Keywords", type: "tags", full: true },
        { name: "ogImage", label: "OG image", type: "image", full: true },
        { name: "twitterHandle", label: "Twitter handle", type: "text" },
        { name: "canonicalHost", label: "Canonical host", type: "text" },
      ] },
    ],
  },
  contact: {
    label: "Contact / NAP", icon: "Phone",
    fields: [
      { name: "phoneDisplay", label: "Phone (display)", type: "text" },
      { name: "phoneHref", label: "Phone link (tel:)", type: "text" },
      { name: "emailDisplay", label: "Email (display)", type: "text" },
      { name: "emailHref", label: "Email link (mailto:)", type: "text" },
      { name: "whatsappNumber", label: "WhatsApp number", type: "text", help: "Digits only, incl. country code" },
      { name: "businessHours", label: "Business hours", type: "text", full: true },
      { name: "responseTimePromise", label: "Response promise", type: "text", full: true },
      { name: "mapEmbedUrl", label: "Map embed URL", type: "text", full: true },
      { name: "address", label: "Address", type: "group", full: true, fields: [
        { name: "line1", label: "Line 1", type: "text" }, { name: "city", label: "City", type: "text" },
        { name: "state", label: "State", type: "text" }, { name: "postalCode", label: "Postal code", type: "text" },
        { name: "country", label: "Country", type: "text" },
      ] },
    ],
  },
  home: {
    label: "Home Hero", icon: "Home",
    fields: [
      { name: "badge", label: "Badge", type: "text", full: true },
      { name: "headingLines", label: "Heading lines", type: "array", full: true, itemFields: [
        { name: "text", label: "Text", type: "text" }, { name: "highlighted", label: "Accent (italic gradient)", type: "boolean" },
      ] },
      { name: "subheading", label: "Subheading", type: "textarea", full: true },
      { name: "ctas", label: "Buttons", type: "array", full: true, itemFields: [
        { name: "label", label: "Label", type: "text" }, { name: "href", label: "Link", type: "text" },
        { name: "variant", label: "Variant", type: "select", options: ["primary", "outline", "secondary", "ghost"].map((v) => ({ label: v, value: v })) },
      ] },
      { name: "socialProof", label: "Social proof", type: "group", full: true, fields: [
        { name: "line1", label: "Line 1", type: "text" }, { name: "line2", label: "Line 2", type: "text" },
        { name: "avatars", label: "Avatars", type: "array", full: true, itemFields: mediaFields },
      ] },
      { name: "stat", label: "Stat", type: "group", fields: [
        { name: "value", label: "Value", type: "text" }, { name: "label", label: "Label", type: "text" },
      ] },
    ],
  },
  navigation: {
    label: "Navigation", icon: "Menu",
    fields: [
      { name: "header", label: "Header", type: "group", full: true, fields: [
        { name: "items", label: "Nav items", type: "array", full: true, itemFields: [
          { name: "label", label: "Label", type: "text" }, { name: "href", label: "Link", type: "text" },
        ] },
        { name: "cta", label: "CTA button", type: "group", full: true, fields: [
          { name: "label", label: "Label", type: "text" }, { name: "href", label: "Link", type: "text" },
        ] },
      ] },
      { name: "footer", label: "Footer", type: "group", full: true, fields: [
        { name: "tagline", label: "Tagline", type: "textarea", full: true },
        { name: "columns", label: "Columns", type: "array", full: true, itemFields: [
          { name: "heading", label: "Heading", type: "text" },
          { name: "links", label: "Links", type: "array", full: true, itemFields: [
            { name: "label", label: "Label", type: "text" }, { name: "href", label: "Link", type: "text" },
          ] },
        ] },
      ] },
    ],
  },
  internship: {
    label: "Internship", icon: "GraduationCap",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text" },
      { name: "title", label: "Title", type: "text", full: true },
      { name: "subtitle", label: "Subtitle", type: "textarea", full: true },
      { name: "batchLabel", label: "Batch label", type: "text" },
      { name: "certificatePreviewImage", label: "Certificate preview", type: "image", full: true },
      { name: "paymentLink", label: "Payment link", type: "text", full: true },
      { name: "pricing", label: "Pricing", type: "group", full: true, fields: [
        { name: "amount", label: "Amount", type: "text" }, { name: "label", label: "Label", type: "text" }, { name: "note", label: "Note", type: "text" },
      ] },
      { name: "benefits", label: "Benefits", type: "array", full: true, itemFields: [
        { name: "icon", label: "Icon", type: "text" }, { name: "title", label: "Title", type: "text" }, { name: "description", label: "Description", type: "textarea", full: true },
      ] },
      { name: "curriculum", label: "Curriculum", type: "array", full: true, itemFields: [
        { name: "week", label: "Week", type: "text" }, { name: "title", label: "Title", type: "text" }, { name: "description", label: "Description", type: "textarea", full: true },
      ] },
      { name: "terms", label: "Terms", type: "stringlist", full: true },
      { name: "checklist", label: "Checklist", type: "stringlist", full: true },
    ],
  },
  legal: {
    label: "Legal", icon: "Scale",
    fields: [
      { name: "privacy", label: "Privacy Policy", type: "group", full: true, fields: [
        { name: "title", label: "Title", type: "text" }, { name: "updatedAt", label: "Updated", type: "text" }, { name: "body", label: "Body (HTML)", type: "richtext", full: true },
      ] },
      { name: "terms", label: "Terms of Service", type: "group", full: true, fields: [
        { name: "title", label: "Title", type: "text" }, { name: "updatedAt", label: "Updated", type: "text" }, { name: "body", label: "Body (HTML)", type: "richtext", full: true },
      ] },
    ],
  },
};
