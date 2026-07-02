import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ScrollToTop } from "@/components/util/ScrollToTop";

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
const Pricing = lazy(() => import("./pages/Pricing"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Legal = lazy(() => import("./pages/Legal"));
const CertificateVerify = lazy(() => import("./pages/CertificateVerify"));
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

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || "/"}>
      <ScrollToTop />
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
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy" element={<Legal kind="privacy" />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
          <Route path="/verify" element={<CertificateVerify />} />
          <Route path="/verify/:certId" element={<CertificateVerify />} />

          {/* Legacy redirects */}
          <Route path="/blogs" element={<Navigate to="/blog" replace />} />
          <Route path="/projects" element={<Navigate to="/work" replace />} />
          <Route path="/portfolio" element={<Navigate to="/work" replace />} />
          <Route path="/ii" element={<Navigate to="/internship" replace />} />

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
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
