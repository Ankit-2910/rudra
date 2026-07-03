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

const FLY_DURATION_MS = 1200;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

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
        const initialPose = CAMERA_POSES[activeRoomRef.current];
        camera.position.set(...initialPose.position);
        const camTarget = new THREE.Vector3(...initialPose.target);
        camera.lookAt(camTarget);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        // ---------- Lighting ----------
        scene.add(new THREE.AmbientLight(0x8899bb, 0.45));
        const moon = new THREE.DirectionalLight(0xaabbee, 0.35);
        moon.position.set(20, 30, 10);
        scene.add(moon);

        // ---------- Floor + grid ----------
        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(120, 120),
          new THREE.MeshStandardMaterial({
            color: 0x0d1220,
            roughness: 0.95,
            metalness: 0.1,
          })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.05;
        scene.add(floor);

        const grid = new THREE.GridHelper(120, 60, 0x1c2740, 0x141c30);
        grid.position.y = 0;
        scene.add(grid);

        // ---------- Helpers ----------
        const clickables: any[] = [];
        const bobbers: { obj: any; baseY: number; phase: number }[] = [];
        const pulsingLights: { light: any; base: number; phase: number }[] = [];
        const glowMaterials: { mat: any; base: number; phase: number }[] = [];

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
            roughness: 0.6,
            metalness: 0.25,
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

        const makeEmployee = (accent: number): any => {
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
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), bodyMat);
          head.position.y = 1.85;
          fig.add(head);
          return fig;
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
              roughness: 0.85,
              metalness: 0.15,
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
          const employee = makeEmployee(accent);
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

          // Floating room label.
          const label = makeLabel(room.name, room.color);
          label.position.set(0, isLobby ? 6.2 : 4.6, 0);
          group.add(label);

          // Warm accent point light for the room, gently pulsing.
          const light = new THREE.PointLight(accent, 1.1, isLobby ? 22 : 16, 2);
          light.position.set(0, 4.5, 0);
          group.add(light);
          pulsingLights.push({
            light,
            base: 1.1,
            phase: Math.random() * Math.PI * 2,
          });

          scene.add(group);
        }

        // ---------- Camera flight state ----------
        const flight = {
          active: false,
          dest: activeRoomRef.current as RoomId,
          start: 0,
          fromPos: new THREE.Vector3(),
          toPos: new THREE.Vector3(),
          fromTarget: new THREE.Vector3(),
          toTarget: new THREE.Vector3(),
        };

        const startFlight = (dest: RoomId, now: number) => {
          const pose = CAMERA_POSES[dest];
          flight.active = true;
          flight.dest = dest;
          flight.start = now;
          flight.fromPos.copy(camera.position);
          flight.fromTarget.copy(camTarget);
          flight.toPos.set(...pose.position);
          flight.toTarget.set(...pose.target);
        };

        // ---------- Interaction ----------
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();

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
          container.style.cursor = pick(event) ? "pointer" : "default";
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
        window.addEventListener("resize", handleResize);
        cleanupListeners = () => {
          renderer.domElement.removeEventListener("click", handleClick);
          renderer.domElement.removeEventListener("pointermove", handlePointerMove);
          window.removeEventListener("resize", handleResize);
        };

        // ---------- Animation loop ----------
        const animate = (now: number) => {
          if (disposed) return;
          rafId = requestAnimationFrame(animate);
          const t = now * 0.001;

          // Kick off a flight whenever the desired room changes.
          if (activeRoomRef.current !== flight.dest) {
            startFlight(activeRoomRef.current, now);
          }
          if (flight.active) {
            const raw = Math.min((now - flight.start) / FLY_DURATION_MS, 1);
            const k = easeInOutCubic(raw);
            camera.position.lerpVectors(flight.fromPos, flight.toPos, k);
            camTarget.lerpVectors(flight.fromTarget, flight.toTarget, k);
            if (raw >= 1) flight.active = false;
          }
          camera.lookAt(camTarget);

          // Idle life: bobbing figures, pulsing lights, glowing sign.
          for (const b of bobbers) {
            b.obj.position.y = b.baseY + Math.sin(t * 1.8 + b.phase) * 0.14;
          }
          for (const p of pulsingLights) {
            p.light.intensity = p.base + Math.sin(t * 2.2 + p.phase) * 0.22;
          }
          for (const g of glowMaterials) {
            g.mat.emissiveIntensity = g.base + Math.sin(t * 2.6 + g.phase) * 0.35;
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
