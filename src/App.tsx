import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ScrollToTop } from "@/components/util/ScrollToTop";
import { RouteErrorBoundary, RouteRendered } from "@/components/util/RouteErrorBoundary";

import Index from "./pages/Index"; // eager: landing page

const About = lazy(() => import("./pages/About"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const ServiceDetail = lazy(() => import("./pages/ServiceDetail"));
const Work = lazy(() => import("./pages/Work"));
const CaseStudy = lazy(() => import("./pages/CaseStudy"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogDetail = lazy(() => import("./pages/BlogDetail"));
const Contact = lazy(() => import("./pages/Contact"));
const Internship = lazy(() => import("./pages/Internship"));
const EduFlow = lazy(() => import("./pages/EduFlow"));
const Pricing = lazy(() => import("./pages/Pricing"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Legal = lazy(() => import("./pages/Legal"));
const CertificateVerify = lazy(() => import("./pages/CertificateVerify"));
const Pitch = lazy(() => import("./pages/Pitch"));
const DemoSiteRoute = lazy(() => import("./pages/DemoSiteRoute"));
const NotFound = lazy(() => import("./pages/NotFound"));

const AdminAuthProvider = lazy(() => import("@/admin/auth").then((m) => ({ default: m.AdminAuthProvider })));
const ProtectedRoute = lazy(() => import("@/admin/ProtectedRoute").then((m) => ({ default: m.ProtectedRoute })));
const AdminLayout = lazy(() => import("@/admin/AdminLayout"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminCollection = lazy(() => import("./pages/admin/AdminCollection"));
const AdminSingleton = lazy(() => import("./pages/admin/AdminSingleton"));
const AdminCertificates = lazy(() => import("./pages/admin/AdminCertificates"));
const AdminSubmissions = lazy(() => import("./pages/admin/AdminSubmissions"));
const AdminApplications = lazy(() => import("./pages/admin/AdminApplications"));
const AdminDemoPreview = lazy(() => import("./pages/admin/AdminDemoPreview"));
const AdminTemplates = lazy(() => import("./pages/admin/AdminTemplates"));
const AdminTemplatePreview = lazy(() => import("./pages/admin/AdminTemplatePreview"));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}

/*
  TWO TOAST SYSTEMS WERE MOUNTED HERE AND NEITHER WAS EVER USED.

  <Toaster /> (Radix) and <Sonner /> both sat at the top of this tree, so both
  shipped in the entry chunk that gates the first paint, sonner 15.75 KB,
  components/ui/toast.tsx 2.63 KB and hooks/use-toast.ts 1.19 KB by the entry
  chunk's own sourcemap, plus @radix-ui/react-toast inside the radix chunk. A grep
  for `toast(` and `useToast(` across src/ returns nothing outside the shadcn
  component definitions themselves: every message the site actually shows is
  inline (the contact form's error summary, the admin's alert()). They were scaffold
  left over from the starter template.

  The components stay on disk as part of the shadcn kit. They are unreferenced, so
  they cost nothing. And anything that wants a toast can mount them again here.

  A <TooltipProvider> was mounted here for the same reason and was dead in the same
  way: nothing on the site renders a <Tooltip>. A grep for the component returns only
  its own definition and components/ui/sidebar.tsx, which has no consumers either. The
  provider is pure context. It renders no DOM and changes no behaviour on its own, 
  but importing it pulled @radix-ui/react-tooltip (and with it @floating-ui/dom and
  react-remove-scroll) into the chunk that gates the first paint on every route. Put
  it back around whatever subtree needs tooltips on the day something actually uses one.
*/
const App = () => (
  <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || "/"}>
    <ScrollToTop />
    {/*
      Outside the Suspense, so a lazy page whose chunk is gone after a deploy
      (or that throws while rendering) lands here instead of unmounting the
      whole tree. Why a chunk goes missing, and the reload that usually fixes
      it first: components/util/RouteErrorBoundary.tsx.
    */}
    <RouteErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Index />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/services/:slug" element={<ServiceDetail />} />
        <Route path="/work" element={<Work />} />
        <Route path="/work/:slug" element={<CaseStudy />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogDetail />} />
        <Route path="/blogs/:id" element={<BlogDetail />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/internship" element={<Internship />} />
        <Route path="/eduflow" element={<EduFlow />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/privacy" element={<Legal kind="privacy" />} />
        <Route path="/terms" element={<Legal kind="terms" />} />
        <Route path="/refund" element={<Legal kind="refund" />} />
        <Route path="/disclaimer" element={<Legal kind="disclaimer" />} />
        <Route path="/verify" element={<CertificateVerify />} />
        <Route path="/verify/:certId" element={<CertificateVerify />} />

        {/* Legacy redirects */}
        <Route path="/blogs" element={<Navigate to="/blog" replace />} />
        <Route path="/projects" element={<Navigate to="/work" replace />} />
        <Route path="/portfolio" element={<Navigate to="/work" replace />} />
        <Route path="/ii" element={<Navigate to="/internship" replace />} />
        {/* The programme is called Ideovent LaunchPad everywhere in
            13-launchpad/. /internship stays the canonical URL because it is
            what is already linked and indexed; this is an alias, not a move. */}
        <Route path="/launchpad" element={<Navigate to="/internship" replace />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminAuthProvider><Outlet /></AdminAuthProvider>}>
          <Route path="login" element={<AdminLogin />} />
          <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="c/:collection" element={<AdminCollection />} />
            <Route path="s/:singleton" element={<AdminSingleton />} />
            <Route path="certificates" element={<AdminCertificates />} />
            <Route path="submissions" element={<AdminSubmissions />} />
            <Route path="applications" element={<AdminApplications />} />
            {/*
              Previewing a demo the public route will not serve.

              Only a `sent` demo opens at /site/<slug>, so a draft has to be
              viewable somewhere, and the wrong answer is a ?preview=1 flag on
              the public route: a query parameter anyone can type is not a
              gate, and it would make every draft readable by whoever guesses
              a slug. This is behind the same login as the rest of /admin, and
              it records no open, so the count still answers "did the
              institute open it" rather than "how often did Mehdi check".
            */}
            <Route path="preview/site/:slug/*" element={<AdminDemoPreview />} />
            {/* The ten fixed templates: preview and duplicate, nothing else.
                They are code, not records; see src/lib/demo/templates. */}
            <Route path="templates" element={<AdminTemplates />} />
          </Route>
          {/*
            A template rendered by the real demo page, full width rather than
            inside the admin shell, because a template is judged as the design
            a director will see. Same login: ProtectedRoute wraps it directly.
          */}
          <Route path="preview/template/:id/*" element={<ProtectedRoute><AdminTemplatePreview /></ProtectedRoute>} />
        </Route>

        {/*
          Pitch pages.

          /pitch/<slug> is the stable address, and the bare /<slug> is the one
          that actually goes into a WhatsApp message, because ideovent.in/the-
          institutes-own-name is the whole point: it looks made for them before
          the page has even loaded.

          Mounting a dynamic segment at the root is safe here. React Router
          ranks a static segment above a dynamic one, so every route declared
          above still wins its own path, and /:slug only ever sees an address
          that matched nothing else. Pitch.tsx renders the ordinary 404 when
          there is no record, so a typo behaves exactly as it did before.
        */}
        {/*
          Demo sites.

          The institute's OWN website, already built, under their own name.
          Mehdi sends the link and says "dekhiye, aapke liye ye website banayi
          hai". It is not a proposal: the pitch pages below are the proposal,
          and the two go out in different conversations.

          /site/ IS ITS OWN NAMESPACE, one segment down, so a demo and a pitch
          for the same institute can never collide at the router and a pasted
          link is unambiguous about which of the two it is. Declaring this
          route also reserves "site" against every future pitch slug for free:
          src/lib/pitch/reservedRoutes.ts parses THIS file rather than reading
          a list somebody has to remember to update.

          It is declared ABOVE the bare /:slug for readability only. React
          Router ranks a two-segment literal path above a one-segment dynamic
          one whatever the order, so /site/x could never have been eaten by
          the pitch route.
        */}
        {/* /* : every subpage of a multi-page demo (/admissions, /courses/<course>). */}
        <Route path="/site/:slug/*" element={<DemoSiteRoute />} />

        <Route path="/pitch/:slug" element={<Pitch />} />
        <Route path="/:slug" element={<Pitch />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      {/* A sibling of <Routes> in the same Suspense, so it commits only once
          the routed page has: that is what clears the reload guard. */}
      <RouteRendered />
    </Suspense>
    </RouteErrorBoundary>
  </BrowserRouter>
);

export default App;
