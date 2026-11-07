import { useEffect } from "react";
import { Link } from "react-router-dom";

/**
 * Shown for unknown addresses. The server still answers 200 (it's a single-page app), so the page
 * asks search engines not to index it.
 */
const NotFound = () => {
  useEffect(() => {
    const previous = document.title;
    document.title = "Page not found | Cristan Jade Jumawan";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => {
      document.title = previous;
      robots.remove();
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <p className="mt-4 text-lg text-muted-foreground">This page doesn&apos;t exist or has moved.</p>
        <Link
          to="/"
          className="mt-6 inline-block text-sm text-foreground underline underline-offset-4 transition-colors hover:text-cyan-400"
        >
          Back to the portfolio
        </Link>
      </div>
    </main>
  );
};

export default NotFound;
