import { ImageResponse } from "next/og";

export const alt = "Supercomputers.pk professional workstations and AI systems";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, color: "white", background: "linear-gradient(135deg,#050609 0%,#101216 70%,#2a1309 100%)", fontFamily: "sans-serif" }}><div style={{ display: "flex", color: "#ff5a1f", fontSize: 22, letterSpacing: 5 }}>SUPERCOMPUTERS.PK</div><div style={{ display: "flex", flexDirection: "column" }}><div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.02, maxWidth: 950 }}>Workstations without compromise.</div><div style={{ display: "flex", marginTop: 28, fontSize: 27, color: "#b7bbc2" }}>AI, engineering and professional systems—built and supported in Pakistan.</div></div><div style={{ display: "flex", width: 210, height: 5, background: "#ff5a1f" }} /></div>, size);
}
