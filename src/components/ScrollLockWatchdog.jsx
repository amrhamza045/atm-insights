import { useEffect } from "react";

// Releases stuck body scroll locks left behind when a dialog/menu/select
// unmounts abruptly (page transitions, capture dialogs, etc.).
// Radix + react-remove-scroll set overflow:hidden / pointer-events:none on
// <body>; if no overlay is actually open, those must be cleared so the
// mouse wheel and scrollbar work again.
export default function ScrollLockWatchdog() {
  useEffect(() => {
    const releaseIfStuck = () => {
      const openOverlay = document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [data-radix-popper-content-wrapper], [data-state="open"][data-radix-menu-content], [data-vaul-drawer][data-state="open"]'
      );
      if (openOverlay) return;

      const body = document.body;
      if (body.style.overflow === "hidden") body.style.overflow = "";
      if (body.style.pointerEvents === "none") body.style.pointerEvents = "";
      if (body.hasAttribute("data-scroll-locked")) body.removeAttribute("data-scroll-locked");
      const html = document.documentElement;
      if (html.style.overflow === "hidden") html.style.overflow = "";
    };

    const interval = setInterval(releaseIfStuck, 1000);
    return () => clearInterval(interval);
  }, []);

  return null;
}