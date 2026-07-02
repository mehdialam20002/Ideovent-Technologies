import type {
  ContentData, BlogPost, Certificate,
} from "./types";
import rawBlogs from "./data/blogs.seed.json";
import rawCerts from "./data/certificates.seed.json";

// Base path prefix so local /public assets resolve under a subpath deploy (e.g. GitHub Pages).
const B = import.meta.env.BASE_URL; // "/" locally, "/Ideovent-Technologies/" on Pages

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);

/* Map the legacy public/blogs.json shape → typed BlogPost */
const seedPosts: BlogPost[] = (rawBlogs as any[]).map((b, i) => ({
  id: String(b.id ?? i + 1),
  title: b.title,
  slug: slugify(b.title),
  excerpt: (b.description || "").toString(),
  coverImage: b.image || `${B}placeholder.svg`,
  body: b.content || `<p>${b.description || ""}</p>`,
  author: "Ideovent Team",
  publishDate: "2025-06-01",
  tags: ["Insights"],
  status: "published",
  featured: i < 2,
  order: i,
}));

/* Map the legacy public/certificates.json shape → typed Certificate */
const seedCerts: Certificate[] = (rawCerts as any[]).map((c, i) => ({
  id: c.id,
  certificateId: c.id,
  internName: c.name,
  designation: c.designation,
  issuedBy: c.issuedBy || "Ideovent Technologies",
  duration: c.duration,
  grade: String(c.grade ?? ""),
  location: c.location || "",
  projectWork: c.project || "",
  profileImage: c.profileImage || "/placeholder.svg",
  certificateImage: c.certificateImage || "/placeholder.svg",
  status: "active",
  issuedAt: "2025-08-09",
  order: i,
}));

export const seed: ContentData = {
  settings: {
    siteName: "Ideovent Technologies",
    logo: `${B}ideovent.png`,
    favicon: `${B}favicon.ico`,
    tagline: "Digital studio for ambitious brands.",
    defaultSeo: {
      title: "Ideovent Technologies — Digital Studio for Websites, Apps & Brands",
      description:
        "Ideovent Technologies is a digital studio crafting high-performance websites, mobile apps, brands and marketing that help ambitious businesses grow.",
      keywords: ["web development", "app development", "UI UX design", "branding", "SEO", "digital agency", "Deoria", "Uttar Pradesh"],
      ogImage: `${B}ideovent.png`,
      twitterHandle: "@ideovent_tech",
      canonicalHost: "https://ideovent.com",
    },
    analytics: {},
  },

  contact: {
    phoneDisplay: "+91 94107 07967",
    phoneHref: "tel:+919410707967",
    emailDisplay: "contact@ideovent.com",
    emailHref: "mailto:contact@ideovent.com",
    whatsappNumber: "919410707967",
    address: { line1: "Salempur", city: "Deoria", state: "Uttar Pradesh", postalCode: "274509", country: "India" },
    businessHours: "Mon – Fri · 9:00 AM – 6:00 PM IST",
    responseTimePromise: "We reply within 24 hours.",
    mapEmbedUrl:
      "https://www.google.com/maps?q=Salempur,Deoria,Uttar+Pradesh+274509&output=embed",
  },

  navigation: {
    header: {
      items: [
        { label: "Home", href: "/" },
        { label: "About", href: "/about" },
        { label: "Services", href: "/services" },
        { label: "Work", href: "/work" },
        { label: "Blog", href: "/blog" },
        { label: "Contact", href: "/contact" },
      ],
      cta: { label: "Get a Quote", href: "/contact", variant: "primary" },
    },
    footer: {
      tagline: "We design and build digital experiences that move brands forward — websites, apps, identities and growth.",
      columns: [
        {
          heading: "Explore",
          links: [
            { label: "Home", href: "/" },
            { label: "About", href: "/about" },
            { label: "Services", href: "/services" },
            { label: "Work", href: "/work" },
          ],
        },
        {
          heading: "Company",
          links: [
            { label: "Blog", href: "/blog" },
            { label: "Internship", href: "/internship" },
            { label: "Verify Certificate", href: "/verify" },
            { label: "Contact", href: "/contact" },
          ],
        },
        {
          heading: "Legal",
          links: [
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Service", href: "/terms" },
            { label: "FAQ", href: "/faq" },
          ],
        },
      ],
    },
  },

  home: {
    badge: "Digital studio · Est. 2024",
    headingLines: [
      { text: "We build" },
      { text: "digital", highlighted: true },
      { text: "that performs." },
    ],
    subheading:
      "Ideovent is a design-led studio crafting fast, beautiful websites, apps and brands. We turn ambitious ideas into products people love to use.",
    ctas: [
      { label: "Start a project", href: "/contact", variant: "primary" },
      { label: "See our work", href: "/work", variant: "outline" },
    ],
    socialProof: {
      line1: "Trusted by founders & teams",
      line2: "building the future",
      avatars: [
        { src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80", alt: "Client" },
        { src: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80", alt: "Client" },
        { src: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=100&q=80", alt: "Client" },
      ],
    },
    mainImage: { src: "https://i.postimg.cc/nLvCH4X2/hero-Sectio.jpg", alt: "Ideovent digital work" },
    stat: { value: "98%", label: "Client satisfaction" },
  },

  internship: {
    eyebrow: "Ideovent LaunchPad",
    title: "3-Month Web Development Internship",
    subtitle: "Practical training · live client projects · verified certificate & recommendation.",
    batchLabel: "Next batch enrolling now",
    certificatePreviewImage: "https://i.postimg.cc/zvV4KHrL/CERINT2025-A73.png",
    benefits: [
      { title: "Live client projects", description: "Ship production code to real projects and grow a portfolio recruiters trust.", icon: "Rocket" },
      { title: "Mentorship by founders", description: "Direct guidance from Ideovent founders and senior developers.", icon: "Users" },
      { title: "Verified certificate", description: "A QR-verifiable certificate and LinkedIn recommendation for top performers.", icon: "Award" },
      { title: "Job-ready skills", description: "Hands-on React, Node, Git, deployment and real team workflow.", icon: "Code" },
      { title: "Portfolio projects", description: "2–3 portfolio-ready builds you can show to any recruiter.", icon: "Briefcase" },
      { title: "Placement assistance", description: "Interview guidance — top performers may receive job offers.", icon: "Target" },
    ],
    curriculum: [
      { week: "Weeks 1–3", title: "Foundations", description: "Modern HTML/CSS, JavaScript, Git & GitHub, and developer workflow." },
      { week: "Weeks 4–7", title: "React & UI", description: "Component architecture, hooks, state, Tailwind and responsive design." },
      { week: "Weeks 8–10", title: "Full-stack", description: "APIs, Node, databases, auth and connecting front-end to back-end." },
      { week: "Weeks 11–12", title: "Capstone & deploy", description: "Ship a real client feature, deploy to production, and present your work." },
    ],
    terms: [
      "Commitment fee confirms your seat and is applied toward the program.",
      "Certificate is issued only after submission and verification of the required tasks.",
      "Complete tasks on time — Ideovent may revoke a certificate for malpractice.",
      "We store your name, email and phone for program administration only.",
    ],
    pricing: { amount: "₹799", label: "Commitment Fee", note: "One-time · confirms your seat" },
    paymentLink: "https://pages.razorpay.com/ideovent",
    checklist: [
      "Fill in your details and submit the application",
      "Complete the commitment payment",
      "Get onboarding + project access within 48 hours",
    ],
  },

  legal: {
    privacy: {
      title: "Privacy Policy",
      updatedAt: "2025-06-01",
      body: "<p>Ideovent Technologies collects only the information you provide through our forms — your name, email, phone and message — to respond to enquiries and administer our programs. We never sell your data. You can request deletion at any time by emailing contact@ideovent.com.</p>",
    },
    terms: {
      title: "Terms of Service",
      updatedAt: "2025-06-01",
      body: "<p>By using this website you agree to use it lawfully. Project engagements are governed by a separate signed agreement. Content on this site is owned by Ideovent Technologies unless otherwise stated.</p>",
    },
  },

  socials: [
    { id: "linkedin", platform: "LinkedIn", label: "LinkedIn", icon: "Linkedin", url: "https://www.linkedin.com/in/ideovent-technologies-a16648356", order: 0 },
    { id: "x", platform: "X", label: "X (Twitter)", icon: "Twitter", url: "https://x.com/Ideovent_", order: 1 },
    { id: "facebook", platform: "Facebook", label: "Facebook", icon: "Facebook", url: "https://www.facebook.com/profile.php?id=61575994778106", order: 2 },
    { id: "instagram", platform: "Instagram", label: "Instagram", icon: "Instagram", url: "https://www.instagram.com/ideovent_official", order: 3 },
  ],

  services: [
    { id: "web", title: "Website Development", slug: "website-development", icon: "Code", category: "Web", showOnHome: true, showInFooter: true, order: 0,
      shortDescription: "Fast, responsive websites built with React, Next.js or WordPress — tuned for speed and conversions.",
      longDescription: "We build custom, high-performance websites tailored to your brand and goals: responsive, SEO-ready and effortless to manage.",
      deliverables: ["Responsive web design", "E-commerce solutions", "Progressive web apps", "CMS integration", "Performance optimization"] },
    { id: "uiux", title: "UI/UX Design", slug: "ui-ux-design", icon: "PenTool", category: "Design", showOnHome: true, showInFooter: true, order: 1,
      shortDescription: "User-centered design that turns first-time visitors into loyal customers.",
      longDescription: "From research to polished interfaces, we craft intuitive experiences that keep users coming back and make your brand unforgettable.",
      deliverables: ["User research", "Wireframing & prototyping", "Interface design", "Usability testing", "Design systems"] },
    { id: "seo", title: "SEO & Digital Marketing", slug: "seo-digital-marketing", icon: "Globe", category: "Marketing", showOnHome: true, showInFooter: true, order: 2,
      shortDescription: "Get found by the right people at the right time and turn traffic into revenue.",
      longDescription: "Data-driven SEO and marketing that grows visibility, traffic and qualified leads — measured and reported transparently.",
      deliverables: ["Search engine optimization", "Content marketing", "Social media strategy", "Email marketing", "Analytics & reporting"] },
    { id: "ecommerce", title: "E-Commerce Development", slug: "ecommerce-development", icon: "ShoppingCart", category: "Web", showOnHome: true, showInFooter: true, order: 3,
      shortDescription: "Online stores that load fast, convert well and are a joy to manage.",
      longDescription: "Powerful, scalable storefronts with secure checkout, inventory and analytics — built to drive sales.",
      deliverables: ["Storefront design & build", "Secure checkout", "Payment gateway integration", "Inventory & orders", "Conversion optimization"] },
    { id: "mobile", title: "Mobile App Development", slug: "mobile-app-development", icon: "Smartphone", category: "Mobile", showOnHome: true, showInFooter: true, order: 4,
      shortDescription: "Native and cross-platform apps for iOS and Android that users love.",
      longDescription: "We design and ship seamless mobile experiences with React Native and native tooling — from concept to the app store.",
      deliverables: ["iOS & Android development", "React Native apps", "Mobile UI/UX design", "App store optimization", "Maintenance & support"] },
    { id: "brand", title: "Brand Identity", slug: "brand-identity", icon: "Sparkles", category: "Design", showOnHome: false, showInFooter: false, order: 5,
      shortDescription: "Cohesive brand identities that make you stand out and stay memorable.",
      longDescription: "Logo, visual identity and guidelines that give your brand a confident, consistent voice across every touchpoint.",
      deliverables: ["Logo design", "Visual identity", "Brand guidelines", "Marketing collateral", "Brand strategy"] },
  ],

  testimonials: [
    { id: "t1", quote: "Ideovent transformed our online presence completely. The site looks stunning and performs exceptionally — a 40% jump in conversions.", authorName: "Kavita Prem", authorPosition: "CEO", authorCompany: "TechStart", authorPhoto: { src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80", alt: "Kavita Prem" }, rating: 5, featured: true, order: 0 },
    { id: "t2", quote: "Working with Ideovent was a game-changer for our e-commerce business. Sales are up 65% since launch.", authorName: "Ravi Raj", authorPosition: "Founder", authorCompany: "StyleMart", authorPhoto: { src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80", alt: "Ravi Raj" }, rating: 5, featured: true, order: 1 },
    { id: "t3", quote: "Their SEO strategy put us on page one for our key terms. Traffic and leads have grown substantially.", authorName: "Ragini Sinha", authorPosition: "Marketing Director", authorCompany: "GrowthBiz", authorPhoto: { src: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80", alt: "Ragini Sinha" }, rating: 5, featured: true, order: 2 },
    { id: "t4", quote: "Ideovent understood our needs and delivered a custom solution perfectly aligned with our brand. Ongoing support has been exceptional.", authorName: "Arbaj Alam", authorPosition: "COO", authorCompany: "InnovateNow", authorPhoto: { src: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120&q=80", alt: "Arbaj Alam" }, rating: 5, featured: true, order: 3 },
  ],

  projects: [
    { id: "highq", title: "HighQ Classes — Educational Website", slug: "highq-classes", category: "web", clientName: "HighQ Classes", featured: true, order: 0,
      summary: "A modern, responsive educational website with course info, inquiry forms and easy navigation for students and parents.",
      technologies: ["React", "TypeScript", "Node.js", "Tailwind CSS"], coverImage: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80", gallery: [], liveUrl: "http://highqclasses.ideovent.com/",
      challenge: "Design a clean, responsive educational site that showcases courses and handles inquiries effectively while staying fast.",
      solution: "We built a responsive site with custom sections for course details, inquiry forms and trust-building testimonials, optimized for both desktop and mobile.",
      results: [{ metric: "60%", label: "More online inquiries" }, { metric: "1st month", label: "Positive student & faculty feedback" }] },
    { id: "onyx", title: "Onyx — Real-Time Desktop AI Copilot", slug: "onyx-realtime-ai-copilot", category: "product", clientName: "Internal product", featured: true, order: 1,
      summary: "A cross-platform desktop AI copilot that overlays context-aware answers on any screen or call, fusing live screen + audio through Google Gemini with on-device voice detection.",
      technologies: ["Electron 33", "React 18", "Vite 5", "TypeScript", "Google Gemini", "ONNX Runtime", "Cloudflare Workers", "Razorpay"],
      coverImage: `${B}work/onyx/cover.png`,
      gallery: [
        { src: `${B}work/onyx/tour-01-welcome.png`, alt: "Onyx onboarding" },
        { src: `${B}work/onyx/tour-03-open-settings.png`, alt: "Onyx settings & providers" },
        { src: `${B}work/onyx/tour-08-done.png`, alt: "Onyx ready to run" },
      ],
      challenge: "Deliver sub-second, context-aware AI over any live screen or call, keep all audio on-device for privacy, stay invisible to screen capture, and wrap it in a real commercial product across Windows, macOS and Linux.",
      solution: "We fused live screen capture and system audio into a single streaming Gemini request, ran a fully on-device VAD pipeline (ONNX Runtime in an audio worklet), built a capture-invisible native overlay via FFI, and shipped a licensing + payments + auto-update stack on Cloudflare Workers.",
      results: [{ metric: "3", label: "Desktop platforms from one codebase" }, { metric: "<1s", label: "Token-streaming responses" }, { metric: "100%", label: "On-device audio processing" }, { metric: "End-to-end", label: "Licensing · payments · auto-update" }],
      body: "" },
    { id: "fintech", title: "FinTech Analytics Dashboard", slug: "fintech-dashboard", category: "web", clientName: "InvestPro Financial", featured: false, order: 2,
      summary: "A high-performance financial analytics dashboard visualizing large datasets in real time for investment professionals.",
      technologies: ["React", "TypeScript", "GraphQL", "Recharts"], coverImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80", gallery: [],
      challenge: "Process and visualize large financial datasets in real time without sacrificing performance.",
      solution: "A responsive dashboard with type-safe React, efficient GraphQL data fetching and dynamic Recharts visualizations.",
      results: [{ metric: "60%", label: "Less data-analysis time" }, { metric: "40%", label: "Better decision efficiency" }] },
    { id: "travel", title: "Travel Booking Platform", slug: "travel-booking-platform", category: "web", clientName: "GlobeTravel Tours", featured: false, order: 3,
      summary: "A travel booking platform with personalized recommendations and real-time availability across providers.",
      technologies: ["React", "Node.js", "MongoDB", "AWS"], coverImage: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80", gallery: [],
      challenge: "Integrate multiple providers and offer personalized recommendations at scale.",
      solution: "A scalable platform with real-time availability and a recommendation engine based on user behavior.",
      results: [{ metric: "35%", label: "Increase in bookings" }, { metric: "50%", label: "Higher satisfaction" }] },
    { id: "elearning", title: "E-Learning Platform", slug: "e-learning-platform", category: "web", clientName: "EduTech Solutions", featured: false, order: 4,
      summary: "An engaging e-learning platform with interactive courses, assessments and progress tracking.",
      technologies: ["React", "Node.js", "MongoDB", "WebRTC"], coverImage: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=1200&q=80", gallery: [],
      challenge: "Support varied content types and provide meaningful progress tracking.",
      solution: "Interactive lessons, real-time video sessions, automated assessments and detailed analytics for learners and instructors.",
      results: [{ metric: "40%", label: "Better engagement" }, { metric: "25%", label: "Higher completion" }] },
    { id: "brandredesign", title: "Corporate Brand Redesign", slug: "corporate-brand-redesign", category: "design", clientName: "TechGlobal", featured: false, order: 5,
      summary: "A complete brand identity redesign — logo, visual identity and guidelines — for a technology company.",
      technologies: ["Brand Strategy", "Visual Design", "UI/UX", "Guidelines"], coverImage: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=1200&q=80", gallery: [],
      challenge: "Refresh an outdated identity to reflect an innovative spirit while keeping brand recognition.",
      solution: "Market research and stakeholder interviews informed a modern identity balancing innovation with heritage.",
      results: [{ metric: "25%", label: "Higher brand recognition" }] },
  ],

  team: [
    { id: "abhishek", name: "Abhishek Tiwari", role: "Director & Founder", visible: true, order: 0,
      bio: "A visionary entrepreneur and strategic leader driving innovation and growth at Ideovent Technologies.",
      photo: { src: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80", alt: "Abhishek Tiwari" },
      socials: [{ platform: "LinkedIn", url: "#", icon: "Linkedin" }] },
    { id: "animesh", name: "Animesh Raturi", role: "Co-Founder & CEO", visible: true, order: 1,
      bio: "Over 5 years of experience in software development and business leadership, leading delivery at Ideovent.",
      photo: { src: `${B}animeshprofile.jpeg`, alt: "Animesh Raturi" },
      socials: [{ platform: "LinkedIn", url: "#", icon: "Linkedin" }] },
    { id: "abhilasha", name: "Abhilasha Kumari", role: "Co-Founder & CTO", visible: true, order: 2,
      bio: "Full-stack developer specializing in React and modern web technologies, owning Ideovent's engineering.",
      photo: { src: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&q=80", alt: "Abhilasha Kumari" },
      socials: [{ platform: "LinkedIn", url: "#", icon: "Linkedin" }] },
  ],

  milestones: [
    { id: "m1", year: "2024", title: "Ideovent is founded", description: "Ideovent Technologies is established with a vision to deliver innovative digital solutions.", order: 0 },
    { id: "m2", year: "2025", title: "First enterprise client", description: "Secured our first enterprise client and grew the core team.", order: 1 },
    { id: "m3", year: "2025", title: "LaunchPad internship", description: "Launched our mentored internship program, training the next generation of developers.", order: 2 },
    { id: "m4", year: "2026", title: "Product engineering", description: "Expanded into full product builds — from real-time desktop apps to commerce platforms.", order: 3 },
  ],

  process: [
    { id: "p1", number: "01", title: "Discover", description: "We start by understanding your business, goals and audience in detail.", order: 0 },
    { id: "p2", number: "02", title: "Design", description: "We shape the experience and interface, aligning every decision to your goals.", order: 1 },
    { id: "p3", number: "03", title: "Build", description: "Our team ships production-grade code with regular, transparent updates.", order: 2 },
    { id: "p4", number: "04", title: "Launch & grow", description: "We deploy, measure and keep improving to ensure lasting success.", order: 3 },
  ],

  faqs: [
    { id: "f1", question: "How much does a website or app cost?", answer: "Pricing depends on scope. After a short discovery call we send a clear, fixed quote — no surprises. Most websites start from a defined package and scale with features.", category: "services", order: 0 },
    { id: "f2", question: "How long does a project take?", answer: "Websites typically take 4–8 weeks; larger applications 2–4 months. We share a timeline before we start and keep you updated throughout.", category: "services", order: 1 },
    { id: "f3", question: "Do you provide ongoing support?", answer: "Yes. We offer maintenance, updates and growth support after launch so your product keeps performing.", category: "services", order: 2 },
    { id: "f4", question: "What do I get from the internship?", answer: "Live client projects, founder mentorship, a QR-verifiable certificate, job-ready skills and placement assistance for top performers.", category: "internship", order: 3 },
    { id: "f5", question: "Is the internship certificate verifiable?", answer: "Yes — every certificate has a unique ID and QR code that verifies instantly on our website at /verify.", category: "internship", order: 4 },
  ],

  stats: [
    { id: "s1", value: 50, suffix: "+", label: "Projects delivered", order: 0 },
    { id: "s2", value: 98, suffix: "%", label: "Client satisfaction", order: 1 },
    { id: "s3", value: 20, suffix: "+", label: "Interns trained", order: 2 },
    { id: "s4", value: 24, suffix: "h", label: "Avg. response time", order: 3 },
  ],

  clients: [],

  posts: seedPosts,
  certificates: seedCerts,
  submissions: [],
  applications: [],
};
