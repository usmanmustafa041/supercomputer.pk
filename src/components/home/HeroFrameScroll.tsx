"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const LAST_FRAME = 102;
const frameSrc = (frame: number) => `/hero-frames/f${String(frame).padStart(3, "0")}.webp`;

const PART_LABELS = [
  { start: 0, end: 18, name: "Workstation chassis", detail: "Full tower enclosure", x: 91, y: 60, side: "right" },
  { start: 12, end: 34, name: "Processor", detail: "Multi-core workstation CPU", x: 62, y: 35, side: "left", essential: true },
  { start: 25, end: 47, name: "System cooling", detail: "High-airflow thermal array", x: 49, y: 31, side: "left", essential: true },
  { start: 38, end: 61, name: "Graphics array", detail: "Dual compute accelerators", x: 78, y: 39, side: "right", essential: true },
  { start: 51, end: 73, name: "Motherboard", detail: "Professional platform", x: 65, y: 55, side: "left" },
  { start: 64, end: 85, name: "ECC memory", detail: "Multi-channel memory bank", x: 66, y: 27, side: "right" },
  { start: 76, end: 96, name: "Power supply", detail: "High-efficiency power delivery", x: 60, y: 69, side: "left" },
  { start: 88, end: LAST_FRAME, name: "Storage array", detail: "High-speed drive bank", x: 84, y: 70, side: "right" },
] as const;

const PROCESS_STEPS = [
  ["Select", "Choose your workload"],
  ["Configure", "Tailor every component"],
  ["Assemble", "Precision-built for you"],
  ["Build your purpose", "Engineered to perform"],
] as const;

export default function HeroFrameScroll() {
  const trackRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Array<HTMLImageElement | undefined>>([]);
  const currentFrameRef = useRef(0);
  const visualFrameRef = useRef(0);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    const canvas = canvasRef.current;
    if (!track || !canvas) return;
    let raf = 0;
    let disposed = false;
    let lastDrawnFrame = -1;
    let lastCanvasWidth = 0;
    let lastCanvasHeight = 0;

    const drawFrame = (index: number, force = false) => {
      const image = imagesRef.current[index];
      if (!image?.complete || !image.naturalWidth) return;
      const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
      if (!context) return;

      const bounds = canvas.getBoundingClientRect();
      // Keep Retina displays crisp without creating an expensive 3x/4x buffer.
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(bounds.width * pixelRatio));
      const height = Math.max(1, Math.round(bounds.height * pixelRatio));
      if (!force && lastDrawnFrame === index && lastCanvasWidth === width && lastCanvasHeight === height) return;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const isDesktop = bounds.width > 700;
      // Give the workstation a little breathing room vertically on desktop.
      // The image keeps its native aspect ratio, so the model is never warped.
      const scale = isDesktop
        ? Math.max((width * 0.82) / image.naturalWidth, (height * 0.78) / image.naturalHeight)
        : Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const focalX = width / height > 1.2 ? 0.62 : 0.5;
      context.fillStyle = "#050609";
      context.fillRect(0, 0, width, height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, width * focalX - drawWidth / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      lastDrawnFrame = index;
      lastCanvasWidth = width;
      lastCanvasHeight = height;
    };

    const loadedImages = imagesRef.current;
    const loading = new Set<number>();

    const loadFrame = (index: number, highPriority = false) => {
      if (index < 0 || index > LAST_FRAME || loadedImages[index] || loading.has(index)) return;
      loading.add(index);
      const image = new Image();
      image.decoding = "async";
      image.fetchPriority = highPriority ? "high" : "low";
      image.onload = () => {
        loading.delete(index);
        loadedImages[index] = image;
        if (!disposed && visualFrameRef.current === index) drawFrame(index, true);
      };
      image.onerror = () => loading.delete(index);
      image.src = frameSrc(index);
    };

    const loadAround = (index: number) => {
      loadFrame(index, true);
      for (let distance = 1; distance <= 5; distance += 1) {
        loadFrame(index + distance, distance <= 2);
        loadFrame(index - distance, distance <= 2);
      }
    };

    // Decode the opening frames first, then warm the rest in small batches.
    // This prevents all 103 images from stalling the main thread together.
    loadAround(0);
    let warmIndex = 6;
    const warmSequence = () => {
      if (disposed || warmIndex > LAST_FRAME) return;
      const batchEnd = Math.min(LAST_FRAME, warmIndex + 5);
      for (; warmIndex <= batchEnd; warmIndex += 1) loadFrame(warmIndex);
      window.setTimeout(warmSequence, 80);
    };
    const warmTimer = window.setTimeout(warmSequence, 250);

    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const range = track.offsetHeight - window.innerHeight;
        const progress = range > 0 ? Math.min(1, Math.max(0, -track.getBoundingClientRect().top / range)) : 0;
        const nextFrame = Math.round(progress * LAST_FRAME);
        const visualFrame = nextFrame;
        if (nextFrame !== currentFrameRef.current) {
          currentFrameRef.current = nextFrame;
          setFrame(nextFrame);
        }
        visualFrameRef.current = visualFrame;
        loadAround(visualFrame);
        drawFrame(visualFrame);
      });
    };

    const resize = () => {
      lastCanvasWidth = 0;
      lastCanvasHeight = 0;
      update();
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(warmTimer);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", resize);
      loadedImages.forEach((image) => { if (image) image.onload = null; });
    };
  }, []);

  const chapterIndex = Math.min(PROCESS_STEPS.length - 1, Math.floor((frame / (LAST_FRAME + 1)) * PROCESS_STEPS.length));
  const visibleLabels = PART_LABELS.filter((part) => frame >= part.start && frame <= part.end);

  return (
    <section ref={trackRef} className="hero-frame-track" aria-label="Scroll through our workstation build">
      <div className="hero-frame-stage">
        {/* Native image keeps the exact poster frame and avoids image-pipeline delay before video metadata loads. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={frameSrc(0)} className="hero-frame-image is-visible" alt="Professional workstation transitioning into an exploded component view" />
        <canvas ref={canvasRef} className="hero-frame-canvas" aria-hidden="true" />
        <div className="hero-frame-blueprint" aria-hidden="true" />
        <div className="hero-frame-vignette" aria-hidden="true" />
        <div className="hero-part-labels" aria-label="Workstation component labels">
          {visibleLabels.map((part) => (
            <div key={part.name} className={`hero-part-label hero-part-label-${part.side}${"essential" in part ? " is-essential" : ""}`} style={{ left: `${part.x}%`, top: `${part.y}%` }}>
              <span className="hero-part-target" aria-hidden="true" />
              <span className="hero-part-copy"><strong>{part.name}</strong><small>{part.detail}</small></span>
            </div>
          ))}
        </div>
        <div className="hero-frame-content shell">
          <div className="hero-frame-copy">
            <div className="hero-frame-kicker t-data"><span>Select</span><i /><span>Configure</span><i /><span>Assemble</span></div>
            <h1 className="hero-frame-title">
              <span className="hero-frame-title-main">Build without</span>
              <span className="hero-frame-title-main">compromise</span>
            </h1>
            <p className="hero-frame-body">Purpose-built AI, engineering and professional workstations.</p>
            <div className="hero-frame-actions flex flex-wrap gap-3">
              <Link href="/configure" className="btn btn-primary">Build your PC <span aria-hidden>→</span></Link>
              <Link href="/systems" className="btn border border-white/35 bg-transparent text-white hover:bg-white/10">Explore workstations</Link>
              <a href="#catalog-start" className="btn hero-frame-skip" aria-label="Skip the workstation animation and view the catalog">
                Skip animation <span aria-hidden>↓</span>
              </a>
            </div>
          </div>
          <div className="hero-frame-meta t-data" aria-live="polite">
            <span>FRAME {String(frame).padStart(3, "0")} / {LAST_FRAME}</span>
            <span className="hero-frame-meter"><i style={{ width: `${(frame / LAST_FRAME) * 100}%` }} /></span>
            <span>{Math.round((frame / LAST_FRAME) * 100)}%</span>
          </div>
          <div className="hero-process" aria-label="Build process">
            <div className="hero-process-line"><i style={{ width: `${(frame / LAST_FRAME) * 100}%` }} /></div>
            {PROCESS_STEPS.map(([label, detail], index) => (
              <div key={label} className={`hero-process-step ${index === chapterIndex ? "is-active" : ""} ${index < chapterIndex ? "is-complete" : ""}`}>
                <span className="hero-process-node">{String(index + 1).padStart(2, "0")}</span>
                <span><strong>{label}</strong><small>{detail}</small></span>
              </div>
            ))}
          </div>
          <div className="hero-frame-scroll-hint t-eyebrow">Scroll to explore <span>↓</span></div>
        </div>
      </div>
    </section>
  );
}
