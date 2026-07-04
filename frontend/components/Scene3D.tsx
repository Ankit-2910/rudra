"use client";

import { useEffect, useRef, useState } from "react";
import { ROOMS, type RoomId } from "../lib/rooms";

interface Scene3DProps {
  activeRoom: RoomId; // camera destination; "lobby" initially
  onRoomSelect: (room: RoomId) => void; // fire when the user clicks a room
}

const THREE_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

// World-space position of each room's floor center.
const ROOM_POSITIONS: Record<RoomId, [number, number, number]> = {
  lobby: [0, 0, 0],
  ceo: [-16, 0, -16],
  finance: [16, 0, -16],
  legal: [-16, 0, 16],
  tenders: [16, 0, 16],
};

// Camera pose per room: where the camera sits and where it looks.
const CAMERA_POSES: Record<
  RoomId,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  lobby: { position: [0, 24, 32], target: [0, 1.5, 0] },
  ceo: { position: [-7.5, 8, -3.5], target: [-16, 2, -16] },
  finance: { position: [7.5, 8, -3.5], target: [16, 2, -16] },
  legal: { position: [-7.5, 8, 28.5], target: [-16, 2, 16] },
  tenders: { position: [7.5, 8, 28.5], target: [16, 2, 16] },
};

// Cinematic entry: the camera starts way up here and glides down into the
// lobby pose on first load.
const ENTRY_POSITION: [number, number, number] = [0, 60, 80];

// Exponential smoothing rates (per second). Higher = snappier.
const CAM_DAMP = 2.4;
const SWAY_DAMP = 1.8;
const HOVER_DAMP = 7.0;
const GAZE_DAMP = 2.2;

const STAR_COUNT = 500;

// Idempotently inject the three.js r128 script tag and resolve with the
// global THREE object once it is available.
function loadThree(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.THREE) {
      resolve(w.THREE);
      return;
    }
    let script = document.querySelector<HTMLScriptElement>(
      `script[src="${THREE_CDN}"]`
    );
    if (!script) {
      script = document.createElement("script");
      script.src = THREE_CDN;
      script.async = true;
      document.head.appendChild(script);
    }
    const onLoad = () => {
      if ((window as any).THREE) resolve((window as any).THREE);
      else reject(new Error("three.js loaded but THREE global is missing"));
    };
    const onError = () => reject(new Error("Failed to load three.js from CDN"));
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
  });
}

export default function Scene3D({ activeRoom, onRoomSelect }: Scene3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  // Keep latest prop values readable from inside the long-lived RAF loop
  // without re-running the setup effect.
  const activeRoomRef = useRef<RoomId>(activeRoom);
  const onRoomSelectRef = useRef<(room: RoomId) => void>(onRoomSelect);
  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);
  useEffect(() => {
    onRoomSelectRef.current = onRoomSelect;
  }, [onRoomSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let rafId: number | null = null;
    let renderer: any = null;
    let cleanupListeners: (() => void) | null = null;

    loadThree()
      .then((THREE: any) => {
        if (disposed || !containerRef.current) return;

        // ---------- Renderer / scene / camera ----------
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0e17);
        scene.fog = new THREE.Fog(0x0a0e17, 40, 90);

        const camera = new THREE.PerspectiveCamera(
          55,
          container.clientWidth / Math.max(container.clientHeight, 1),
          0.1,
          200
        );

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        // ---------- Lighting ----------
        // Hemisphere light gives the low-poly forms a soft sky/ground
        // gradient so faces read with depth instead of flat ambient.
        scene.add(new THREE.HemisphereLight(0x3b4a6e, 0x0a0e17, 0.65));
        scene.add(new THREE.AmbientLight(0x8899bb, 0.28));
        const moon = new THREE.DirectionalLight(0xaabbee, 0.4);
        moon.position.set(20, 30, 10);
        scene.add(moon);

        // ---------- Floor + grid ----------
        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(120, 120),
          new THREE.MeshStandardMaterial({
            color: 0x0d1220,
            roughness: 0.7,
            metalness: 0.35,
          })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.05;
        scene.add(floor);

        const grid = new THREE.GridHelper(120, 60, 0x1c2740, 0x141c30);
        grid.position.y = 0;
        scene.add(grid);

        // ---------- Starfield ambience ----------
        // Two additive point layers in the room accent colors + white,
        // drifting in opposite directions with offset twinkle phases.
        const palette: any[] = [
          new THREE.Color(0xffffff),
          new THREE.Color(0xffffff),
          ...ROOMS.map((r) => new THREE.Color(r.color)),
        ];
        const makeStars = (count: number, size: number): any => {
          const positions = new Float32Array(count * 3);
          const colors = new Float32Array(count * 3);
          for (let i = 0; i < count; i++) {
            const radius = 16 + Math.random() * 48;
            const angle = Math.random() * Math.PI * 2;
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = 4 + Math.random() * 40;
            positions[i * 3 + 2] = Math.sin(angle) * radius;
            const c = palette[(Math.random() * palette.length) | 0];
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
          }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
          geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
          const mat = new THREE.PointsMaterial({
            size,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
            fog: false,
          });
          const points = new THREE.Points(geo, mat);
          scene.add(points);
          return points;
        };
        const starsA = makeStars(Math.floor(STAR_COUNT * 0.6), 0.32);
        const starsB = makeStars(Math.ceil(STAR_COUNT * 0.4), 0.2);

        // ---------- Helpers ----------
        const clickables: any[] = [];
        const bobbers: { obj: any; baseY: number; phase: number }[] = [];
        const glowMaterials: { mat: any; base: number; phase: number }[] = [];
        // Per-room animated state: accent light, glow ring, hoverable slab.
        const roomFx: {
          id: RoomId;
          light: any;
          lightBase: number;
          ring: any;
          ringMat: any;
          ringBaseY: number;
          slab: any;
          slabBaseY: number;
          hover: number;
          phase: number;
        }[] = [];
        // Employee "life": heads that occasionally look at the camera and a
        // pulsing status orb above each figure.
        const gazers: {
          head: any;
          orb: any;
          orbMat: any;
          orbBaseY: number;
          worldX: number;
          worldZ: number;
          gaze: number;
          phase: number;
        }[] = [];

        const makeLabel = (text: string, accent: string): any => {
          const canvas = document.createElement("canvas");
          canvas.width = 512;
          canvas.height = 128;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, 512, 128);
            ctx.font = "bold 44px 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = accent;
            ctx.shadowBlur = 18;
            ctx.fillStyle = "#ffffff";
            ctx.fillText(text, 256, 54);
            ctx.shadowBlur = 0;
            ctx.fillStyle = accent;
            ctx.fillRect(176, 96, 160, 5);
          }
          const texture = new THREE.CanvasTexture(canvas);
          const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
          });
          const sprite = new THREE.Sprite(material);
          sprite.scale.set(9, 2.25, 1);
          return sprite;
        };

        const makeDesk = (accent: number): any => {
          const desk = new THREE.Group();
          const woodMat = new THREE.MeshStandardMaterial({
            color: 0x2a2f45,
            roughness: 0.55,
            metalness: 0.3,
          });
          const top = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.25, 1.5), woodMat);
          top.position.y = 1.05;
          desk.add(top);
          const base = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.95, 1.2), woodMat);
          base.position.y = 0.48;
          desk.add(base);
          // A slim glowing screen on the desk.
          const screen = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 0.65, 0.06),
            new THREE.MeshStandardMaterial({
              color: 0x0a0e17,
              emissive: accent,
              emissiveIntensity: 0.9,
            })
          );
          screen.position.set(0, 1.55, -0.3);
          desk.add(screen);
          return desk;
        };

        const makeEmployee = (accent: number): { fig: any; head: any } => {
          const fig = new THREE.Group();
          const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x1b2338,
            emissive: accent,
            emissiveIntensity: 0.55,
            roughness: 0.45,
            metalness: 0.3,
          });
          const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.32, 0.45, 1.3, 10),
            bodyMat
          );
          body.position.y = 0.85;
          fig.add(body);
          // Head is a group so the whole face (skull + visor) can turn to
          // "look" at the camera.
          const head = new THREE.Group();
          head.position.y = 1.85;
          const skull = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), bodyMat);
          head.add(skull);
          const visor = new THREE.Mesh(
            new THREE.BoxGeometry(0.36, 0.12, 0.08),
            new THREE.MeshStandardMaterial({
              color: 0x0a0e17,
              emissive: accent,
              emissiveIntensity: 1.1,
            })
          );
          visor.position.set(0, 0.04, 0.28);
          head.add(visor);
          fig.add(head);
          return { fig, head };
        };

        // ---------- Build each room ----------
        for (const room of ROOMS) {
          const [rx, , rz] = ROOM_POSITIONS[room.id];
          const accent = new THREE.Color(room.color).getHex();
          const isLobby = room.id === "lobby";
          const group = new THREE.Group();
          group.position.set(rx, 0, rz);

          // Floor slab in a slightly lighter shade — the main click target.
          const slabSize = isLobby ? 12 : 10;
          const slab = new THREE.Mesh(
            new THREE.BoxGeometry(slabSize, 0.2, slabSize),
            new THREE.MeshStandardMaterial({
              color: 0x161d31,
              roughness: 0.5,
              metalness: 0.4,
            })
          );
          slab.position.y = 0.1;
          slab.userData.roomId = room.id;
          group.add(slab);
          clickables.push(slab);

          // Thin accent trim around the slab edge.
          const trim = new THREE.Mesh(
            new THREE.BoxGeometry(slabSize + 0.3, 0.06, slabSize + 0.3),
            new THREE.MeshStandardMaterial({
              color: 0x0a0e17,
              emissive: accent,
              emissiveIntensity: 0.35,
            })
          );
          trim.position.y = 0.03;
          trim.userData.roomId = room.id;
          group.add(trim);
          clickables.push(trim);

          // Emissive glow ring hugging the slab, pulsing in the accent color.
          const ringMat = new THREE.MeshBasicMaterial({
            color: accent,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(slabSize * 0.72, 0.07, 8, 48),
            ringMat
          );
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = 0.14;
          group.add(ring);

          // Desk.
          const desk = makeDesk(accent);
          desk.position.set(0, 0.2, isLobby ? 1.5 : 0.5);
          desk.traverse((child: any) => {
            if (child.isMesh) {
              child.userData.roomId = room.id;
              clickables.push(child);
            }
          });
          group.add(desk);

          if (isLobby) {
            // Reception desk gets an extra stacked box tier and a glowing sign.
            const tier = new THREE.Mesh(
              new THREE.BoxGeometry(4.2, 0.3, 1.9),
              new THREE.MeshStandardMaterial({
                color: 0x232a42,
                roughness: 0.6,
                metalness: 0.3,
              })
            );
            tier.position.set(0, 0.15, 1.5);
            tier.userData.roomId = room.id;
            group.add(tier);
            clickables.push(tier);

            const signMat = new THREE.MeshStandardMaterial({
              color: 0x0a0e17,
              emissive: accent,
              emissiveIntensity: 1.2,
            });
            const sign = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.9, 0.25), signMat);
            sign.position.set(0, 4.6, -1.5);
            sign.userData.roomId = room.id;
            group.add(sign);
            clickables.push(sign);
            glowMaterials.push({ mat: signMat, base: 1.2, phase: 0 });

            // Two slim pylons holding the sign.
            const pylonMat = new THREE.MeshStandardMaterial({
              color: 0x1b2338,
              roughness: 0.7,
            });
            for (const px of [-2.4, 2.4]) {
              const pylon = new THREE.Mesh(
                new THREE.CylinderGeometry(0.09, 0.09, 4.4, 8),
                pylonMat
              );
              pylon.position.set(px, 2.3, -1.5);
              group.add(pylon);
            }
          }

          // AI employee figure behind the desk.
          const { fig: employee, head } = makeEmployee(accent);
          employee.position.set(isLobby ? 0 : 0.9, 0.2, isLobby ? 2.9 : -1.1);
          employee.traverse((child: any) => {
            if (child.isMesh) {
              child.userData.roomId = room.id;
              clickables.push(child);
            }
          });
          group.add(employee);
          bobbers.push({
            obj: employee,
            baseY: employee.position.y,
            phase: Math.random() * Math.PI * 2,
          });

          // Floating status orb above the employee's head.
          const orbMat = new THREE.MeshBasicMaterial({
            color: accent,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const orb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), orbMat);
          orb.position.set(0, 2.55, 0);
          employee.add(orb);

          gazers.push({
            head,
            orb,
            orbMat,
            orbBaseY: orb.position.y,
            worldX: rx + employee.position.x,
            worldZ: rz + employee.position.z,
            gaze: 0,
            phase: Math.random() * Math.PI * 2,
          });

          // Floating room label.
          const label = makeLabel(room.name, room.color);
          label.position.set(0, isLobby ? 6.2 : 4.6, 0);
          group.add(label);

          // Warm accent point light for the room, gently pulsing.
          const light = new THREE.PointLight(accent, 1.1, isLobby ? 22 : 16, 2);
          light.position.set(0, 4.5, 0);
          group.add(light);

          roomFx.push({
            id: room.id,
            light,
            lightBase: 1.1,
            ring,
            ringMat,
            ringBaseY: ring.position.y,
            slab,
            slabBaseY: slab.position.y,
            hover: 0,
            phase: Math.random() * Math.PI * 2,
          });

          scene.add(group);
        }

        // ---------- Camera: smooth-damped flights + idle sway ----------
        // The camera exponentially eases toward the desired pose every frame
        // (spring-like, no fixed duration), starting from a high entry pose
        // for a cinematic reveal.
        const desiredPos = new THREE.Vector3(
          ...CAMERA_POSES[activeRoomRef.current].position
        );
        const desiredTarget = new THREE.Vector3(
          ...CAMERA_POSES[activeRoomRef.current].target
        );
        const smoothPos = new THREE.Vector3(...ENTRY_POSITION);
        const smoothTarget = new THREE.Vector3(0, 1.5, 0);
        camera.position.copy(smoothPos);
        camera.lookAt(smoothTarget);
        let currentDest: RoomId = activeRoomRef.current;
        let swayAmt = 0; // 0 while flying, eases to 1 once settled
        let lastNow = -1;

        // ---------- Interaction ----------
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        let hoveredRoom: RoomId | null = null;

        const pick = (event: PointerEvent | MouseEvent): RoomId | null => {
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          const hits = raycaster.intersectObjects(clickables, false);
          if (hits.length > 0) {
            const roomId = hits[0].object.userData.roomId as RoomId | undefined;
            return roomId ?? null;
          }
          return null;
        };

        const handleClick = (event: MouseEvent) => {
          const roomId = pick(event);
          if (roomId) onRoomSelectRef.current(roomId);
        };

        const handlePointerMove = (event: PointerEvent) => {
          hoveredRoom = pick(event);
          container.style.cursor = hoveredRoom ? "pointer" : "default";
        };

        const handlePointerLeave = () => {
          hoveredRoom = null;
          container.style.cursor = "default";
        };

        const handleResize = () => {
          const w = container.clientWidth;
          const h = Math.max(container.clientHeight, 1);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };

        renderer.domElement.addEventListener("click", handleClick);
        renderer.domElement.addEventListener("pointermove", handlePointerMove);
        renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
        window.addEventListener("resize", handleResize);
        cleanupListeners = () => {
          renderer.domElement.removeEventListener("click", handleClick);
          renderer.domElement.removeEventListener("pointermove", handlePointerMove);
          renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
          window.removeEventListener("resize", handleResize);
        };

        // ---------- Animation loop (no per-frame allocations) ----------
        const animate = (now: number) => {
          if (disposed) return;
          rafId = requestAnimationFrame(animate);
          const t = now * 0.001;
          if (lastNow < 0) lastNow = now;
          const dt = Math.min((now - lastNow) / 1000, 0.05);
          lastNow = now;

          // Retarget whenever the desired room changes.
          if (activeRoomRef.current !== currentDest) {
            currentDest = activeRoomRef.current;
            const pose = CAMERA_POSES[currentDest];
            desiredPos.set(pose.position[0], pose.position[1], pose.position[2]);
            desiredTarget.set(pose.target[0], pose.target[1], pose.target[2]);
          }

          // Smooth-damp toward the pose; sway fades out during flights and
          // breathes back in once the camera has settled.
          const camK = 1 - Math.exp(-CAM_DAMP * dt);
          smoothPos.lerp(desiredPos, camK);
          smoothTarget.lerp(desiredTarget, camK);
          const settling = smoothPos.distanceTo(desiredPos) < 1.2 ? 1 : 0;
          swayAmt += (settling - swayAmt) * (1 - Math.exp(-SWAY_DAMP * dt));
          camera.position.copy(smoothPos);
          camera.position.x += Math.sin(t * 0.5) * 0.15 * swayAmt;
          camera.position.y += Math.sin(t * 0.8 + 1.7) * 0.1 * swayAmt;
          camera.lookAt(smoothTarget);

          // Starfield drift + twinkle.
          starsA.rotation.y = t * 0.012;
          starsA.material.opacity = 0.7 + Math.sin(t * 1.3) * 0.18;
          starsB.rotation.y = -t * 0.017;
          starsB.material.opacity = 0.55 + Math.sin(t * 1.7 + 1.3) * 0.22;

          // Idle life: bobbing figures, glowing sign.
          for (const b of bobbers) {
            b.obj.position.y = b.baseY + Math.sin(t * 1.8 + b.phase) * 0.14;
          }
          for (const g of glowMaterials) {
            g.mat.emissiveIntensity = g.base + Math.sin(t * 2.6 + g.phase) * 0.35;
          }

          // Room glow rings, pulsing lights and eased hover highlight.
          const hoverK = 1 - Math.exp(-HOVER_DAMP * dt);
          for (const fx of roomFx) {
            const isActive = fx.id === activeRoomRef.current;
            fx.hover += ((fx.id === hoveredRoom ? 1 : 0) - fx.hover) * hoverK;
            const pulse = Math.sin(t * 2.3 + fx.phase);
            fx.ringMat.opacity =
              (isActive ? 0.6 + pulse * 0.28 : 0.26 + pulse * 0.1) +
              fx.hover * 0.3;
            const ringScale = 1 + fx.hover * 0.05 + (isActive ? pulse * 0.012 : 0);
            fx.ring.scale.set(ringScale, ringScale, 1);
            fx.light.intensity =
              fx.lightBase +
              pulse * 0.2 +
              fx.hover * 1.1 +
              (isActive ? 0.35 : 0);
            fx.slab.position.y = fx.slabBaseY + fx.hover * 0.14;
            fx.ring.position.y = fx.ringBaseY + fx.hover * 0.14;
          }

          // Employee heads occasionally turn toward the camera; status orbs
          // float and pulse.
          const gazeK = 1 - Math.exp(-GAZE_DAMP * dt);
          for (const gz of gazers) {
            const wants = Math.sin(t * 0.3 + gz.phase) > 0.45 ? 1 : 0;
            gz.gaze += (wants - gz.gaze) * gazeK;
            const yaw = Math.atan2(
              camera.position.x - gz.worldX,
              camera.position.z - gz.worldZ
            );
            gz.head.rotation.y = yaw * gz.gaze;
            gz.head.rotation.x = -0.12 * gz.gaze;
            gz.orb.position.y =
              gz.orbBaseY + Math.sin(t * 2.1 + gz.phase) * 0.1;
            const orbPulse = 0.75 + Math.sin(t * 3.1 + gz.phase) * 0.25;
            gz.orbMat.opacity = orbPulse;
            gz.orb.scale.set(orbPulse + 0.35, orbPulse + 0.35, orbPulse + 0.35);
          }

          renderer.render(scene, camera);
        };
        rafId = requestAnimationFrame(animate);

        setReady(true);
      })
      .catch((err: unknown) => {
        if (!disposed) {
          // Leave the loading overlay up; log for debugging.
          console.error("Scene3D failed to initialise:", err);
        }
      });

    return () => {
      disposed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (cleanupListeners) cleanupListeners();
      if (renderer) {
        const canvas = renderer.domElement as HTMLCanvasElement;
        renderer.dispose();
        if (canvas.parentElement) canvas.parentElement.removeChild(canvas);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0e17] text-slate-300 text-sm tracking-wide">
          Loading headquarters…
        </div>
      )}
    </div>
  );
}
