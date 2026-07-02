import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Aurora } from "@/components/ui/aurora";

export default function NotFound() {
  return (
    <Layout>
      <Seo title="Page not found" noindex />
      <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden">
        <Aurora />
        <div className="container-page relative text-center">
          <p className="font-display text-[8rem] font-semibold leading-none text-gradient md:text-[12rem]">404</p>
          <h1 className="mt-2 font-display text-2xl font-semibold">This page took a <span className="accent-italic">wrong turn.</span></h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">The page you're looking for may have been moved, renamed, or never existed.</p>
          <Link to="/" className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground transition-transform hover:scale-105">
            Back to home
          </Link>
        </div>
      </section>
    </Layout>
  );
}
