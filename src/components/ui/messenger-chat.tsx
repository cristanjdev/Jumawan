import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Send } from "lucide-react";
import { convexClient } from "@/lib/convexClient";
import { api } from "../../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * My Messenger chat.
 * On computers, m.me/<username> and messenger.com send people to an end-to-end encrypted chat that
 * messenger.com can get stuck loading (a blank "Facebook user" chat, seen Nov 2026). The same chat loads
 * properly inside facebook.com, so computers go to facebook.com/messages. Someone with an old,
 * pre-encryption chat with me first sees a "Continue" button there, which moves them to the new chat.
 * On phones m.me is the link that opens the Messenger app.
 */
const MESSENGER_USERNAME = "cristanjade14";
const DESKTOP_MESSENGER_URL = `https://www.facebook.com/messages/t/${MESSENGER_USERNAME}`;
const MOBILE_MESSENGER_URL = `https://m.me/${MESSENGER_USERNAME}`;

function isPhoneOrTablet() {
  if (typeof navigator === "undefined") return false;
  // iPadOS reports itself as a Mac, so also check for a touch screen
  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}
const DEFAULT_GREETING = "Hi Cristan! I saw your portfolio and I'd like to chat.";

/** The Messenger logo: a speech bubble with a lightning bolt. */
function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78a.8.8 0 0 0 1.12.71l1.98-.87a.8.8 0 0 1 .54-.04c.91.25 1.87.38 2.9.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2Z"
      />
      <path
        fill="var(--messenger-bolt, #fff)"
        d="m6 14.54 2.94-4.66a1.5 1.5 0 0 1 2.17-.4l2.34 1.75a.6.6 0 0 0 .72 0l3.16-2.4c.42-.32.97.18.69.63l-2.94 4.66a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63Z"
      />
    </svg>
  );
}

const MESSENGER_GRADIENT = "linear-gradient(135deg, #00B2FF 0%, #006AFF 45%, #A033FF 80%, #FF5C87 100%)";

/** Copies text, falling back to the old copy command where the Clipboard API is missing (older browsers, in-app browsers). */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

type SendState = "idle" | "sending" | "sent" | "error";

/**
 * Floating "Chat with me" button and its modal.
 *
 * A website can't send a Messenger message for a visitor: Messenger always needs them to be logged in and
 * to press Send themselves (and a personal profile's m.me link can't pre-fill the text). So the modal:
 *  1. copies the visitor's first message and opens my Messenger chat, where they paste it and press Send
 *     (Messenger asks them to log in first if they aren't);
 *  2. for visitors without Facebook, sends the same message through the site's contact inbox instead.
 */
export function MessengerChat() {
  const [open, setOpen] = useState(false);
  // Decided after mount so the first render matches on every device
  const [messengerUrl, setMessengerUrl] = useState(DESKTOP_MESSENGER_URL);
  useEffect(() => {
    if (isPhoneOrTablet()) setMessengerUrl(MOBILE_MESSENGER_URL);
  }, []);
  const messengerLinkRef = useRef<HTMLAnchorElement>(null);
  const [message, setMessage] = useState(DEFAULT_GREETING);
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");

  const [showFallback, setShowFallback] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sendState, setSendState] = useState<SendState>("idle");
  const [sendError, setSendError] = useState("");

  // Start fresh each time the modal is opened again after a message was sent
  useEffect(() => {
    if (open && sendState === "sent") {
      setSendState("idle");
      setShowFallback(false);
      setMessage(DEFAULT_GREETING);
    }
    if (!open) setCopied("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const text = message.trim() || DEFAULT_GREETING;

  // The link itself opens Messenger (a real link isn't stopped by popup blockers); copying runs alongside it
  const handleOpenMessenger = () => {
    void copyText(text).then((ok) => setCopied(ok ? "copied" : "failed"));
  };

  const handleCopyAgain = async () => {
    setCopied((await copyText(text)) ? "copied" : "failed");
  };

  const handleSendHere = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setSendError("Please enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setSendError("Please enter a valid email so I can reply.");
    }
    setSendError("");
    setSendState("sending");
    try {
      await convexClient.mutation(api.contactMessages.create, {
        name: name.trim(),
        email: email.trim(),
        subject: "Chat request from the portfolio",
        message: text,
      });
      setSendState("sent");
    } catch {
      setSendState("error");
      setSendError("Couldn't send right now. Please try again, or email cristanjade14@gmail.com.");
    }
  };

  const inputClass =
    "w-full rounded-lg border border-[var(--modal-btn-border)] bg-[var(--modal-btn-bg)] px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 outline-none transition-colors focus:border-[#006AFF]/60";

  return (
    <>
      {/* Floating button: above the phone tab bar, bottom-right on larger screens */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Chat with me on Messenger"
        className={cn(
          "group fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_10px_30px_-8px_rgba(0,106,255,0.65)] transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006AFF] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6 md:right-6"
        )}
        style={{ background: MESSENGER_GRADIENT }}
      >
        <MessengerIcon className="h-7 w-7 [--messenger-bolt:#006AFF] [&>path:first-child]:fill-white" />
        <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-lg border border-[var(--modal-btn-border)] bg-[var(--surface-modal)] px-3 py-1.5 text-xs font-medium text-foreground/80 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 md:block">
          Chat with me
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          data-lenis-prevent
          // Focus the main button rather than the text box, so phones don't pop up the keyboard straight away
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            messengerLinkRef.current?.focus();
          }}
          className="w-[calc(100%-2rem)] max-w-md gap-0 overflow-hidden rounded-2xl border-[var(--modal-btn-border)] bg-[var(--surface-modal)] p-0 sm:rounded-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-[var(--modal-btn-border)] px-5 py-4 pr-12">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
              style={{ background: MESSENGER_GRADIENT }}
            >
              <MessengerIcon className="h-5 w-5 [--messenger-bolt:#006AFF] [&>path:first-child]:fill-white" />
            </span>
            <div className="min-w-0 text-left">
              <DialogTitle className="text-base">Chat with me on Messenger</DialogTitle>
              <DialogDescription className="mt-1 text-xs">I usually reply within a day.</DialogDescription>
            </div>
          </div>

          <div className="space-y-4 px-5 py-5">
            {sendState === "sent" ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Check className="h-6 w-6" />
                </span>
                <p className="text-sm font-medium text-foreground">Message sent. Thank you!</p>
                <p className="text-xs text-muted-foreground">I'll reply to {email.trim()} soon.</p>
              </div>
            ) : (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-foreground/70">Your first message</span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    className={cn(inputClass, "resize-none")}
                  />
                </label>

                <a
                  ref={messengerLinkRef}
                  href={messengerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleOpenMessenger}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold !text-white shadow-[0_8px_24px_-10px_rgba(0,106,255,0.8)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
                  style={{ background: MESSENGER_GRADIENT }}
                >
                  <MessengerIcon className="h-4 w-4 [--messenger-bolt:#006AFF] [&>path:first-child]:fill-white" />
                  Copy message &amp; open Messenger
                </a>

                {copied === "copied" && (
                  <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                    <span>
                      <strong className="font-semibold">Message copied.</strong> In Messenger, paste it into the chat and press Send. If you see a <strong className="font-semibold">Continue</strong> button instead of a message box, click it first.
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyAgain}
                      className="flex shrink-0 items-center gap-1 font-medium text-emerald-800 hover:text-emerald-950 dark:text-emerald-200 dark:hover:text-white"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy again
                    </button>
                  </div>
                )}
                {copied === "failed" && (
                  <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300">
                    Your browser didn't allow copying. Messenger is open: just type your message there.
                  </p>
                )}

                <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                  Messenger will ask you to log in to Facebook first if you aren't already.
                </p>

                {/* Fallback for visitors without Facebook */}
                <div className="border-t border-[var(--modal-btn-border)] pt-4">
                  {!showFallback ? (
                    <button
                      type="button"
                      onClick={() => setShowFallback(true)}
                      className="w-full text-center text-xs font-medium text-foreground/70 underline-offset-4 hover:text-foreground hover:underline"
                    >
                      No Facebook account? Send your message from here
                    </button>
                  ) : (
                    <form onSubmit={handleSendHere} className="space-y-3" noValidate>
                      <p className="text-xs text-muted-foreground">
                        I'll get your message right here and reply by email.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                          autoComplete="name"
                          maxLength={100}
                          className={inputClass}
                        />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Your email"
                          autoComplete="email"
                          maxLength={254}
                          className={inputClass}
                        />
                      </div>
                      {sendError && <p className="text-xs text-red-600 dark:text-red-400">{sendError}</p>}
                      <button
                        type="submit"
                        disabled={sendState === "sending"}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--modal-btn-border)] bg-[var(--modal-btn-bg)] px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/10 disabled:opacity-60"
                      >
                        {sendState === "sending" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        {sendState === "sending" ? "Sending…" : "Send message"}
                      </button>
                      <p className="text-center text-[11px] text-muted-foreground">
                        See the{" "}
                        <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
                          privacy policy
                        </a>{" "}
                        for how messages are handled.
                      </p>
                    </form>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
