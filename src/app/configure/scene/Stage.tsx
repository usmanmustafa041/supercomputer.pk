"use client";

import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Grid, OrbitControls, Edges, Html, ContactShadows } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { MM_PER_UNIT, layout, ghosts, type Box, type Interior, type Placement } from "@/lib/build3d/geometry";
import type { BuildLine } from "@/lib/compat/types";
import type { Kind } from "@/lib/catalog/types";
import { useScenePalette, type ScenePalette } from "./theme";

/* ------------------------------------------------------------------ utils */

const u = (mm: number) => mm / MM_PER_UNIT;

/**
 * Chassis space is origin-at-corner with z running front to back. Three's +z
 * points at the viewer, so z is flipped here — otherwise the case renders
 * back-to-front and the power supply ends up in your face.
 */
function toScene(box: Box, it: Interior): [number, number, number] {
  return [u(box.pos.x - it.width / 2), u(box.pos.y), u(it.depth / 2 - box.pos.z)];
}

/* ---------------------------------------------------------------- shell */

function Shell({ it, pal, hasChassis }: { it: Interior; pal: ScenePalette; hasChassis: boolean }) {
  const w = u(it.width);
  const h = u(it.height);
  const d = u(it.depth);

  return (
    <group position={[0, h / 2, 0]}>
      {/* Only the floor and the far wall are solid. A translucent side panel
          was the single biggest legibility problem — it greyed out everything
          behind it, which is the entire build. The cage edges carry the
          boundary instead, which is also what reads as "enclosure". */}
      <mesh position={[0, -h / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={pal.shell} roughness={0.85} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -d / 2]} receiveShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color={pal.shell}
          roughness={0.95}
          metalness={0}
          transparent
          opacity={0.75}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial visible={false} />
        <Edges
          color={hasChassis ? pal.shellEdge : pal.ghost}
          lineWidth={hasChassis ? 2.2 : 1.2}
          {...(hasChassis ? {} : { dashed: true, dashSize: 0.12, gapSize: 0.08 })}
        />
      </mesh>

      {/* Rack ear / front-face marker so the orientation is never ambiguous. */}
      <mesh position={[0, -h / 2 + 0.02, d / 2]}>
        <boxGeometry args={[w, 0.03, 0.03]} />
        <meshBasicMaterial color={pal.accent} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------- part mesh */

/**
 * Metalness is kept low deliberately. A metallic surface takes the colour of
 * whatever is lighting it, which had the dark-grey power supply rendering
 * cyan under the rim light. Parts need to keep their own identity here.
 */
const KIND_LOOK: Record<string, { color: (p: ScenePalette) => string; metal: number; rough: number }> = {
  motherboard: { color: (p) => p.board, metal: 0.05, rough: 0.8 },
  cpu: { color: (p) => p.metal, metal: 0.35, rough: 0.3 },
  cooler: { color: (p) => p.metal, metal: 0.3, rough: 0.42 },
  memory: { color: (p) => p.cool, metal: 0.2, rough: 0.4 },
  gpu: { color: (p) => p.accent, metal: 0.15, rough: 0.45 },
  psu: { color: (p) => p.metalDark, metal: 0.25, rough: 0.55 },
  storage: { color: (p) => p.metal, metal: 0.3, rough: 0.4 },
};

function PartMesh({
  placement,
  it,
  pal,
  selected,
  dimmed,
  onSelect,
}: {
  placement: Placement;
  it: Interior;
  pal: ScenePalette;
  selected: boolean;
  dimmed: boolean;
  onSelect: (id: string | null) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const look = KIND_LOOK[placement.kind] ?? { color: (p: ScenePalette) => p.metal, metal: 0.5, rough: 0.5 };
  const { box } = placement;

  /**
   * Everything visual is declared on the mesh, so the part is correct whether
   * or not the frame loop runs. An earlier version started at scale 0.001 and
   * grew via useFrame, which meant a throttled or backgrounded render loop
   * left the entire build invisible.
   */
  useFrame((_, dt) => {
    if (!ref.current) return;
    const [x, y, z] = toScene(box, it);
    const lift = hovered || selected ? 0.045 : 0;
    ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, y + lift, 12, dt);
    ref.current.position.x = x;
    ref.current.position.z = z;
  });

  const colour = placement.clips ? pal.err : look.color(pal);

  return (
    <mesh
      ref={ref}
      position={toScene(box, it)}
      castShadow
      receiveShadow
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(selected ? null : placement.id);
      }}
    >
      <boxGeometry args={[u(box.size.x), u(box.size.y), u(box.size.z)]} />
      <meshStandardMaterial
        color={colour}
        metalness={look.metal}
        roughness={look.rough}
        transparent
        opacity={dimmed ? 0.25 : 1}
        emissive={placement.clips ? pal.err : hovered || selected ? colour : "#000000"}
        emissiveIntensity={placement.clips ? 0.45 : hovered || selected ? 0.3 : 0}
      />
      <Edges color={placement.clips ? pal.err : selected ? pal.accent : pal.shellEdge} lineWidth={selected ? 2 : 1} />

      {(selected || hovered) && (
        <Html center distanceFactor={6} position={[0, u(box.size.y) / 2 + 0.18, 0]} zIndexRange={[20, 0]}>
          <div className="panel px-2 py-1 whitespace-nowrap pointer-events-none">
            <span className="t-data text-[10px] text-ink">{placement.label}</span>
            {placement.clips && <span className="t-data text-[10px] text-err ml-2">does not fit</span>}
          </div>
        </Html>
      )}
    </mesh>
  );
}

/* ----------------------------------------------------------- drop ghosts */

function Ghost({
  box,
  it,
  label,
  pal,
  active,
}: {
  box: Box;
  it: Interior;
  label: string;
  pal: ScenePalette;
  active: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);

  // Pulse is an enhancement layered on a value that is already correct in the
  // declared material, so a stalled frame loop just means no pulse.
  useFrame((state) => {
    if (!ref.current || !active) return;
    const m = ref.current.material as THREE.MeshBasicMaterial;
    m.opacity = 0.18 + Math.sin(state.clock.elapsedTime * 4) * 0.09;
  });

  return (
    <group position={toScene(box, it)}>
      <mesh ref={ref}>
        <boxGeometry args={[u(box.size.x), u(box.size.y), u(box.size.z)]} />
        <meshBasicMaterial
          color={active ? pal.accent : pal.ghost}
          transparent
          opacity={active ? 0.18 : 0.06}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <boxGeometry args={[u(box.size.x), u(box.size.y), u(box.size.z)]} />
        <meshBasicMaterial visible={false} />
        <Edges color={active ? pal.accent : pal.ghost} lineWidth={active ? 2 : 1} dashed dashSize={0.08} gapSize={0.06} />
      </mesh>
      {active && (
        <Html center distanceFactor={7}>
          <div className="pill pill-acc pointer-events-none">drop {label.toLowerCase()}</div>
        </Html>
      )}
    </group>
  );
}

/* ------------------------------------------------------------ the scene */

function SceneBody({
  lines,
  pal,
  dragKind,
  selected,
  onSelect,
}: {
  lines: BuildLine[];
  pal: ScenePalette;
  dragKind: Kind | null;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { interior, placements } = useMemo(() => layout(lines), [lines]);
  const ghostList = useMemo(() => ghosts(lines), [lines]);
  const hasChassis = lines.some((l) => l.product.kind === "chassis");
  const span = Math.max(u(interior.width), u(interior.depth));

  return (
    <>
      <color attach="background" args={[pal.bg]} />
      {/* No fog. It started at roughly the camera distance, so the whole model
          sat inside it and faded to the near-black background. */}

      {/* Key light warm and neutral, fill cool but weak. The rim used to be a
          strong cyan directional, which recoloured every metallic surface. */}
      <ambientLight intensity={pal.dark ? 1.6 : 2.2} />
      <hemisphereLight args={[pal.dark ? "#8FA2BC" : "#FFFFFF", pal.dark ? "#141922" : "#C4CCD8", pal.dark ? 1.6 : 1.4]} />
      <directionalLight position={[5, 8, 6]} intensity={pal.dark ? 2.6 : 2.4} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-6, 4, -3]} intensity={pal.dark ? 1.1 : 0.6} color="#FFFFFF" />
      <pointLight
        position={[u(interior.width) * 0.2, u(interior.height) * 0.65, u(interior.depth) * 0.3]}
        intensity={pal.dark ? 2.2 : 1}
        color={pal.accent}
        distance={5}
      />

      <Grid
        position={[0, -0.002, 0]}
        args={[30, 30]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor={pal.grid}
        sectionSize={2}
        sectionThickness={1.1}
        sectionColor={pal.gridMajor}
        fadeDistance={span * 5}
        fadeStrength={1.4}
        infiniteGrid
        followCamera={false}
      />

      <ContactShadows position={[0, 0.001, 0]} opacity={pal.dark ? 0.55 : 0.3} scale={span * 3} blur={2.4} far={4} />

      <Shell it={interior} pal={pal} hasChassis={hasChassis} />

      {ghostList.map((g, i) => (
        <Ghost key={`${g.kind}-${i}`} box={g.box} it={interior} label={g.label} pal={pal} active={dragKind === g.kind} />
      ))}

      {placements.map((p, i) => (
        <PartMesh
          key={`${p.id}-${i}`}
          placement={p}
          it={interior}
          pal={pal}
          selected={selected === p.id}
          dimmed={Boolean(selected) && selected !== p.id}
          onSelect={onSelect}
        />
      ))}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={span * 0.45}
        maxDistance={span * 3.2}
        maxPolarAngle={Math.PI / 2 - 0.03}
        target={[0, u(interior.height) * 0.45, 0]}
      />
    </>
  );
}

/* --------------------------------------------------------------- wrapper */

export interface StageProps {
  lines: BuildLine[];
  /** Kind currently being dragged over the stage, so ghosts can respond. */
  dragKind: Kind | null;
  onDropPart: (kind: Kind) => void;
  onDragKind: (kind: Kind | null) => void;
  errorIds: string[];
}

export default function Stage({ lines, dragKind, onDropPart, onDragKind, errorIds }: StageProps) {
  const pal = useScenePalette();
  const [selected, setSelected] = useState<string | null>(null);
  const { interior } = useMemo(() => layout(lines), [lines]);
  const span = Math.max(u(interior.width), u(interior.depth), u(interior.height));

  return (
    <div
      className="relative w-full h-full"
      onDragOver={(e) => {
        // Without preventDefault the browser refuses the drop outright.
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        onDragKind(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        const kind = e.dataTransfer.getData("application/x-tf-kind") as Kind;
        onDragKind(null);
        if (kind) onDropPart(kind);
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        // Framed from the open side. The previous distance sat about twice as
        // far back as the field of view needed, so the case read as a speck.
        camera={{ position: [span * 0.95, span * 0.72, span * 1.15], fov: 40, near: 0.05, far: 120 }}
        onPointerMissed={() => setSelected(null)}
        gl={{ antialias: true }}
      >
        <SceneBody
          lines={lines}
          pal={pal}
          dragKind={dragKind}
          selected={selected}
          onSelect={setSelected}
        />
      </Canvas>

      {/* overlay chrome */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
        <span className="pill">{interior.rack ? "rack interior" : "tower interior"}</span>
        <span className="t-data text-[10px] text-ink-3">
          {Math.round(interior.width)} × {Math.round(interior.height)} × {Math.round(interior.depth)} mm
        </span>
      </div>

      {errorIds.length > 0 && (
        <div className="absolute top-3 right-3 pointer-events-none">
          <span className="pill pill-err">{errorIds.length} part{errorIds.length > 1 ? "s" : ""} conflict</span>
        </div>
      )}

      <div className="absolute bottom-3 left-3 t-data text-[10px] text-ink-3 pointer-events-none leading-relaxed">
        drag to orbit · scroll to zoom · right-drag to pan
        <br />
        drag a slot from the list into the case
      </div>
    </div>
  );
}
