"use client";

import { useSyncExternalStore } from "react";

/**
 * Three.js materials cannot read CSS custom properties, so the palette has to
 * be pulled out of the document and handed to the renderer. Subscribing to the
 * same theme event the toggle dispatches keeps the scene in step.
 */

export interface ScenePalette {
  dark: boolean;
  bg: string;
  grid: string;
  gridMajor: string;
  shell: string;
  shellEdge: string;
  glass: string;
  board: string;
  metal: string;
  metalDark: string;
  accent: string;
  cool: string;
  ok: string;
  err: string;
  ghost: string;
}

const DARK: ScenePalette = {
  dark: true,
  bg: "#0A0D13",
  grid: "#232B37",
  gridMajor: "#39434F",
  // The cavity has to sit clearly above the background or the case reads as a
  // hole rather than an enclosure.
  shell: "#242B36",
  shellEdge: "#5B6675",
  glass: "#7FA8C8",
  board: "#123024",
  metal: "#8A94A3",
  metalDark: "#3A424E",
  accent: "#FF5A1F",
  cool: "#29D3EE",
  ok: "#6EE05A",
  err: "#FF4D4D",
  ghost: "#5B6675",
};

const LIGHT: ScenePalette = {
  dark: false,
  bg: "#E7EAEF",
  grid: "#C3CAD4",
  gridMajor: "#A6AFBD",
  shell: "#D6DBE3",
  shellEdge: "#5F6875",
  glass: "#9BBBD6",
  board: "#2C6A4C",
  metal: "#9AA3B0",
  metalDark: "#6C7683",
  accent: "#E24A0C",
  cool: "#0E93AB",
  ok: "#2E9E43",
  err: "#C42121",
  ghost: "#8892A0",
};

const EVENT = "tf-theme-change";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

function getSnapshot(): boolean {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

export function useScenePalette(): ScenePalette {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, () => false);
  return isDark ? DARK : LIGHT;
}
