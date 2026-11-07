import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const UPDATED = "November 7, 2026";
const CONTACT_EMAIL = "cristanjade14@gmail.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{children}</div>
    </section>
  );
}

/** Privacy policy, written for the Philippine Data Privacy Act of 2012 (RA 10173). */
const Privacy = () => {
  useEffect(() => {
    const previous = document.title;
    document.title = "Privacy Policy | Cristan Jade Jumawan";
    window.scrollTo(0, 0);
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <main className="min-h-screen bg-background px-6 py-16 sm:py-24">
      <article className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-cyan-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to portfolio
        </Link>

        <h1 className="mt-8 text-3xl font-bold text-foreground sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

        <p className="mt-8 text-sm leading-relaxed text-muted-foreground sm:text-base">
          This website, <strong className="text-foreground">cjjumawan.com</strong>, is the personal portfolio of Cristan
          Jade Jumawan, based in the Philippines. This page explains what information the site collects, why, how it
          is protected, and the rights you have under the Data Privacy Act of 2012 (Republic Act No. 10173).
        </p>

        <Section title="1. What is collected">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-foreground">Contact form:</strong> your name, email address, subject and message,
              only when you choose to send them.
            </li>
            <li>
              <strong className="text-foreground">Anonymous usage counts:</strong> which sections of the site are viewed
              and when a message is sent. No IP address, device identifier or cookie is stored, and these counts can't
              identify you.
            </li>
            <li>
              <strong className="text-foreground">Settings on your device:</strong> your light/dark theme and animation
              preference are saved in your browser&apos;s local storage. They stay on your device and are never sent to
              this site.
            </li>
          </ul>
          <p>The site does not use advertising, tracking cookies or third-party analytics, and never sells your information.</p>
        </Section>

        <Section title="2. Why it is used">
          <p>
            Your message is used only to read and reply to you. It is processed with your consent, which you give by
            submitting the form. The anonymous counts help show which parts of the portfolio are useful.
          </p>
        </Section>

        <Section title="3. Where it is stored">
          <p>The site relies on a few service providers, who handle data only to run the site:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-foreground">Convex</strong> stores contact messages, site content and files (servers
              in the United States).
            </li>
            <li>
              <strong className="text-foreground">Vercel</strong> hosts the website.
            </li>
            <li>
              <strong className="text-foreground">Google Fonts, Fontshare and jsDelivr</strong> deliver fonts and icons. Like
              any website, they receive your IP address when your browser downloads these files.
            </li>
          </ul>
        </Section>

        <Section title="4. How long it is kept">
          <p>
            Messages are kept only as long as needed to respond and follow up, and no longer than two years. You can
            ask for yours to be deleted at any time.
          </p>
        </Section>

        <Section title="5. How it is protected">
          <p>
            All connections to the site are encrypted (HTTPS). Messages can be read only by the site owner, through a
            password-protected admin area.
          </p>
        </Section>

        <Section title="6. Your rights">
          <p>
            Under the Data Privacy Act you have the right to be informed, to access your data, to object to its
            processing, to have it corrected, erased or blocked, to data portability, and to claim damages. To use any
            of these rights, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground underline underline-offset-4 hover:text-cyan-400">
              {CONTACT_EMAIL}
            </a>
            . You will get a reply within 30 days.
          </p>
          <p>
            If you believe your data was mishandled, you may also file a complaint with the{" "}
            <a
              href="https://privacy.gov.ph"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-4 hover:text-cyan-400"
            >
              National Privacy Commission
            </a>
            .
          </p>
        </Section>

        <Section title="7. Changes">
          <p>If this policy changes, the new version will be posted on this page with a new date.</p>
        </Section>
      </article>
    </main>
  );
};

export default Privacy;
