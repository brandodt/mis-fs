'use client';

import { useEffect, useRef } from 'react';
import Avatar from 'boring-avatars';
import gsap from 'gsap';

// Consistent color palette shared across avatar + UI accents
export const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

/**
 * RadarView
 * ─────────
 * Renders a Three.js animated radar sweep behind HTML device-avatar bubbles.
 * Three.js is dynamically imported so it never runs on the server (SSR-safe).
 * GSAP animates bubbles in whenever the device list changes.
 *
 * Props:
 *  devices          – array of { id, name } objects (receive-mode peers)
 *  onSendToDevice   – callback(deviceId) called when a bubble is clicked
 */
export function RadarView({ devices, onSendToDevice }) {
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);
  const animFrameRef = useRef(null);
  const rendererRef  = useRef(null);
  const bubblesRef   = useRef([]);

  // ─── Three.js radar initialisation (runs once) ───────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let mounted = true;

    import('three').then((THREE) => {
      if (!mounted || !canvasRef.current || !containerRef.current) return;

      const canvas = canvasRef.current;
      const size   = containerRef.current.clientWidth || 380;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setSize(size, size);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      rendererRef.current = renderer;

      // Scene + orthographic camera (-1..1 NDC space)
      const scene  = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.position.z = 5;

      // ── Concentric rings ──────────────────────────────────────────────────
      [0.88, 0.63, 0.38].forEach((r, i) => {
        const geo = new THREE.TorusGeometry(r, 0.003, 16, 100);
        const mat = new THREE.MeshBasicMaterial({
          color: 0x3b82f6,
          transparent: true,
          opacity: 0.10 + i * 0.06,
        });
        scene.add(new THREE.Mesh(geo, mat));
      });

      // ── Centre dot ────────────────────────────────────────────────────────
      const cDot = new THREE.Mesh(
        new THREE.CircleGeometry(0.022, 32),
        new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.75 }),
      );
      scene.add(cDot);

      // ── Sweep group (line + trailing fan) ─────────────────────────────────
      const sweepGroup = new THREE.Group();

      // Main scan line
      sweepGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0.88, 0),
        ]),
        new THREE.LineBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.9 }),
      ));

      // Trailing fan (60-degree ghost behind the sweep)
      const TRAIL_STEPS  = 32;
      const TRAIL_ANGLE  = Math.PI / 3; // 60 °
      const fanVerts     = new Float32Array(TRAIL_STEPS * 9); // 3 verts × 3 coords per tri
      for (let i = 0; i < TRAIL_STEPS; i++) {
        const a1 = (i       / TRAIL_STEPS) * TRAIL_ANGLE;
        const a2 = ((i + 1) / TRAIL_STEPS) * TRAIL_ANGLE;
        const base = i * 9;
        // Centre
        fanVerts[base]     = 0;  fanVerts[base + 1] = 0;  fanVerts[base + 2] = 0;
        // Point 1
        fanVerts[base + 3] = 0.88 * Math.sin(a1);
        fanVerts[base + 4] = 0.88 * Math.cos(a1);
        fanVerts[base + 5] = 0;
        // Point 2
        fanVerts[base + 6] = 0.88 * Math.sin(a2);
        fanVerts[base + 7] = 0.88 * Math.cos(a2);
        fanVerts[base + 8] = 0;
      }
      const fanGeo = new THREE.BufferGeometry();
      fanGeo.setAttribute('position', new THREE.Float32BufferAttribute(fanVerts, 3));
      sweepGroup.add(new THREE.Mesh(
        fanGeo,
        new THREE.MeshBasicMaterial({
          color: 0x22c55e,
          transparent: true,
          opacity: 0.07,
          side: THREE.DoubleSide,
        }),
      ));

      scene.add(sweepGroup);

      // ── Background particle field ─────────────────────────────────────────
      const NUM_DOTS  = 55;
      const dotPos    = new Float32Array(NUM_DOTS * 3);
      for (let i = 0; i < NUM_DOTS; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 0.06 + Math.random() * 0.80;
        dotPos[i * 3]     = Math.cos(a) * r;
        dotPos[i * 3 + 1] = Math.sin(a) * r;
        dotPos[i * 3 + 2] = 0;
      }
      const dotGeo = new THREE.BufferGeometry();
      dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(dotPos, 3));
      scene.add(new THREE.Points(
        dotGeo,
        new THREE.PointsMaterial({ color: 0x3b82f6, size: 0.011, transparent: true, opacity: 0.22 }),
      ));

      // ── Animation loop ────────────────────────────────────────────────────
      const animate = () => {
        if (!mounted) return;
        animFrameRef.current = requestAnimationFrame(animate);
        sweepGroup.rotation.z -= 0.017; // clockwise sweep
        renderer.render(scene, camera);
      };
      animate();
    });

    return () => {
      mounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (rendererRef.current)  rendererRef.current.dispose();
    };
  }, []); // only init once

  // ─── GSAP bubble entrance animation on device-list change ─────────────────
  useEffect(() => {
    const els = bubblesRef.current.filter(Boolean);
    if (els.length === 0) return;

    gsap.fromTo(
      els,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.45, stagger: 0.08, ease: 'back.out(1.7)' },
    );
  }, [devices.length]);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto"
      style={{ width: '100%', maxWidth: '340px', aspectRatio: '1 / 1' }}
    >
      {/* ── Three.js radar canvas (background) ─────────────────────────── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ borderRadius: '50%' }}
      />

      {/* ── Outer ring border ───────────────────────────────────────────── */}
      <div className="absolute inset-0 rounded-full border-2 border-blue-300/30 dark:border-blue-500/25 pointer-events-none" />

      {/* ── Device avatar bubbles ───────────────────────────────────────── */}
      {devices.map((device, index) => {
        /* Distribute bubbles evenly, starting at the top (−90°) */
        const angleDeg = (360 / devices.length) * index - 90;
        const rad      = (angleDeg * Math.PI) / 180;
        const pct      = 35; // radius as % of container width (stays inside ring)

        return (
          <div
            key={device.id}
            ref={(el) => { bubblesRef.current[index] = el; }}
            className="absolute flex flex-col items-center"
            style={{
              top:   `calc(50% + ${pct * Math.sin(rad)}% - 44px)`,
              left:  `calc(50% + ${pct * Math.cos(rad)}% - 36px)`,
              width: '72px',
              zIndex: 10,
            }}
          >
            <button
              id={`radar-device-${device.id}`}
              data-device-bubble={device.id}
              onClick={() => onSendToDevice(device.id)}
              title={`Send to ${device.name}`}
              className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-400 dark:border-blue-500 hover:border-purple-400 dark:hover:border-purple-400 hover:scale-110 transition-all duration-300 shadow-lg shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800"
            >
              <Avatar
                size={62}
                name={device.name}
                variant="beam"
                colors={AVATAR_COLORS}
              />
            </button>

            {/* Device name label */}
            <span className="mt-1.5 text-[10px] font-semibold text-gray-700 dark:text-gray-300 text-center line-clamp-2 leading-tight px-0.5 drop-shadow-sm">
              {device.name}
            </span>
          </div>
        );
      })}

      {/* ── Centre "you" dot ────────────────────────────────────────────── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-500 shadow-md shadow-blue-500/50 animate-pulse pointer-events-none z-10" />
    </div>
  );
}
