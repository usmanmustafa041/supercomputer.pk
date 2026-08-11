"use client";

import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";
export const THEME_KEY = "tf-theme";
const THEME_EVENT = "tf-theme-change";

/**
 * Runs before first paint, inlined into <head>. Without it the page renders
 * dark for a frame and then snaps to light, which is worse than no toggle.
 * Kept as a string so it can be injected without a hydration boundary.
 */
export const THEME_SCRIPT = `(function(){try{
var q=new URLSearchParams(location.search).get('theme');
var s=localStorage.getItem('${THEME_KEY}');
var t=(q==='light'||q==='dark')?q:((s==='light'||s==='dark')?s:'light');
if(q==='light'||q==='dark'){localStorage.setItem('${THEME_KEY}',q)}
document.documentElement.setAttribute('data-theme',t);
}catch(e){document.documentElement.setAttribute('data-theme','light')}})()`;

/**
 * The <html> attribute is the source of truth, it is set by the inline script
 * before React exists. Reading it through useSyncExternalStore is how React
 * wants external state consumed: no setState-in-effect, and the server/client
 * difference is handled by the server snapshot rather than being a mismatch.
 */
function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/** Light is the default, so that is what the server renders. */
function getServerSnapshot(): Theme {
  return "light";
}

function Sun() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.1 3.1l1.1 1.1M11.8 11.8l1.1 1.1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Moon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" aria-hidden="true">
      <path
        d="M13.2 9.6A5.8 5.8 0 0 1 6.4 2.8 5.8 5.8 0 1 0 13.2 9.6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function flip() {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private mode or blocked storage, the toggle still works this session.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      onClick={flip}
      className="btn btn-ghost btn-sm btn-icon"
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      title={theme === "light" ? "Dark" : "Light"}
    >
      {theme === "light" ? <Moon /> : <Sun />}
    </button>
  );
}
