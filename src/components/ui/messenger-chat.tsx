import { useEffect, useRef, useState } from "react";
import { Facebook } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const FACEBOOK_USERNAME = "cristanjade14";
const FACEBOOK_PROFILE_URL = `https://www.facebook.com/${FACEBOOK_USERNAME}`;

/**
 * The link that opens my Messenger chat best on each kind of device (tested Nov 2026):
 *  - Android: m.me opens the chat in the Messenger app.
 *  - iPhone / iPad: m.me goes to the App Store page even when Messenger is installed, while
 *    messenger.com/t/<username> opens the chat in the app.
 *  - Computers: m.me and messenger.com can get stuck on a blank "Facebook user" chat (the encrypted chat
 *    doesn't load on messenger.com), but the same chat loads inside facebook.com/messages. Someone with an
 *    old, pre-encryption chat with me first sees a "Continue" button there, which opens the new chat.
 */
const MESSENGER_URLS = {
  android: `https://m.me/${FACEBOOK_USERNAME}`,
  ios: `https://www.messenger.com/t/${FACEBOOK_USERNAME}`,
  desktop: `https://www.facebook.com/messages/t/${FACEBOOK_USERNAME}`,
};

function messengerUrlForDevice() {
  if (typeof navigator === "undefined") return MESSENGER_URLS.desktop;
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, so also check for a touch screen
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    return MESSENGER_URLS.ios;
  }
  if (/Android|Mobile/i.test(ua)) return MESSENGER_URLS.android;
  return MESSENGER_URLS.desktop;
}

const MESSENGER_GRADIENT = "linear-gradient(135deg, #00B2FF 0%, #006AFF 45%, #A033FF 80%, #FF5C87 100%)";

/** The Messenger logo: a white speech bubble with a blue lightning bolt (fixed colours, so the light theme can't tint it). */
function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#fff"
        d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78a.8.8 0 0 0 1.12.71l1.98-.87a.8.8 0 0 1 .54-.04c.91.25 1.87.38 2.9.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2Z"
      />
      <path
        fill="#006AFF"
        d="m6 14.54 2.94-4.66a1.5 1.5 0 0 1 2.17-.4l2.34 1.75a.6.6 0 0 0 .72 0l3.16-2.4c.42-.32.97.18.69.63l-2.94 4.66a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63Z"
      />
    </svg>
  );
}

/**
 * Floating "Chat with me" button and its modal: a quick way to open my Messenger chat or my Facebook
 * profile. (A website can't type or send a Messenger message for a visitor, so the modal just takes them
 * to the chat.)
 */
export function MessengerChat() {
  const [open, setOpen] = useState(false);
  const messengerLinkRef = useRef<HTMLAnchorElement>(null);
  // Decided after mount so the first render matches on every device
  const [messengerUrl, setMessengerUrl] = useState(MESSENGER_URLS.desktop);
  useEffect(() => setMessengerUrl(messengerUrlForDevice()), []);

  return (
    <>
      {/* Floating button: above the phone tab bar, bottom-right on larger screens */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Chat with me on Messenger"
        className={cn(
          "group fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-[0_8px_22px_-8px_rgba(0,106,255,0.6)] transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006AFF] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6 md:right-6"
        )}
        style={{ background: MESSENGER_GRADIENT }}
      >
        <MessengerIcon className="h-6 w-6" />
        <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-lg border border-[var(--modal-btn-border)] bg-[var(--surface-modal)] px-3 py-1.5 text-xs font-medium text-foreground/80 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 md:block">
          Chat with me
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          data-lenis-prevent
          // Focus the main button, so keyboard users can press Enter straight away
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            messengerLinkRef.current?.focus();
          }}
          className="w-[calc(100%-2rem)] max-w-sm gap-0 overflow-hidden rounded-2xl border-[var(--modal-btn-border)] bg-[var(--surface-modal)] p-0 sm:rounded-2xl"
        >
          <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
            {/* My Facebook profile picture (a saved copy: Facebook doesn't let sites load it directly) */}
            <span className="relative">
              <span className="block rounded-full p-[3px]" style={{ background: MESSENGER_GRADIENT }}>
                <img
                  src="/messenger-avatar.jpg"
                  alt="Cristan Jade Jumawan"
                  width={88}
                  height={88}
                  className="h-[88px] w-[88px] rounded-full border-[3px] border-[var(--surface-modal)] object-cover"
                />
              </span>
              <span
                className="absolute bottom-0.5 right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-[var(--surface-modal)]"
                style={{ background: MESSENGER_GRADIENT }}
              >
                <MessengerIcon className="h-3.5 w-3.5" />
              </span>
            </span>
            <DialogTitle className="mt-4 text-lg">Cristan Jade Jumawan</DialogTitle>
            <p className="mt-1 text-xs font-medium text-muted-foreground">facebook.com/{FACEBOOK_USERNAME}</p>
            <DialogDescription className="mt-3 text-sm">
              Have a project or a question? Message me on Messenger. I usually reply within a day.
            </DialogDescription>

            <a
              ref={messengerLinkRef}
              href={messengerUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold !text-white shadow-[0_8px_24px_-10px_rgba(0,106,255,0.8)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
              style={{ background: MESSENGER_GRADIENT }}
            >
              <MessengerIcon className="h-4 w-4" />
              Open Messenger
            </a>

            <a
              href={FACEBOOK_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--modal-btn-border)] bg-[var(--modal-btn-bg)] px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-foreground/10"
            >
              <Facebook className="h-4 w-4 text-[#1877F2]" />
              View my Facebook profile
            </a>

          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
