import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import { ContentProvider } from "./lib/cms/context";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange themes={["light", "dark"]}>
      <ContentProvider>
        <App />
      </ContentProvider>
    </ThemeProvider>
  </HelmetProvider>
);
