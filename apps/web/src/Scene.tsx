import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { VStack } from '@astryxdesign/core/Stack';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MAX_GLB_BYTES, validateGlbBuffer } from './glb.ts';
import type { Snapshot } from '../../../packages/protocol/src/index.ts';

export interface SceneHandle { setView(yaw: number, pitch: number): void; }
export interface SceneProps {
  snapshot: Snapshot | null;
  playerId: string | null;
  importedFile: File | null;
  onImportStatus(message: string): void;
  onRendererStatus(message: string): void;
}

const PALETTE = {
  sky: 0xe9eeec, floor: 0xe1e5e1, wall: 0xcbd3ce, line: 0xb8c5be,
  blue: 0x3c7593, blueLight: 0x95b8c9, coral: 0xd27863,
  white: 0xe9ede8, joint: 0x37484d, visor: 0x9ce2dc, light: 0xffdfb2,
};
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
function rejectImport(message: string): never { throw new Error(message); }

function disposeObject(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      geometries.add(child.geometry);
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      }
    }
    if (child instanceof THREE.LineSegments || child instanceof THREE.Line) {
      geometries.add(child.geometry);
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) materials.add(material);
    }
  });
  textures.forEach((texture) => { texture.dispose(); if (typeof ImageBitmap !== 'undefined' && texture.image instanceof ImageBitmap) texture.image.close(); });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

interface MechVisual {
  root: THREE.Group; shellSocket: THREE.Group; legs: THREE.Group[];
  arms: THREE.Group[]; jets: THREE.Mesh[]; gun: THREE.Group; phase: number;
}

function makeMech(color: number): MechVisual {
  const root = new THREE.Group();
  const armor = new THREE.MeshStandardMaterial({ color, roughness: 0.52, metalness: 0.28 });
  const white = new THREE.MeshStandardMaterial({ color: PALETTE.white, roughness: 0.64, metalness: 0.18 });
  const joint = new THREE.MeshStandardMaterial({ color: PALETTE.joint, roughness: 0.65, metalness: 0.45 });
  const visor = new THREE.MeshStandardMaterial({ color: PALETTE.visor, emissive: PALETTE.visor, emissiveIntensity: 0.45 });
  const jet = new THREE.MeshBasicMaterial({ color: PALETTE.light, transparent: true, opacity: 0.8 });
  const box = (parent: THREE.Object3D, dimensions: number[], position: number[], material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions as [number, number, number]), material);
    mesh.position.set(...position as [number, number, number]); mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  };
  const sphere = (parent: THREE.Object3D, radius: number, position: number[]) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), joint);
    mesh.position.set(...position as [number, number, number]); parent.add(mesh); return mesh;
  };
  box(root, [0.64, 0.22, 0.38], [0, -0.2, 0], joint);
  box(root, [0.7, 0.56, 0.4], [0, 0.28, 0], white);
  box(root, [0.75, 0.25, 0.18], [0, 0.42, -0.22], armor).rotation.x = -0.12;
  box(root, [0.28, 0.21, 0.12], [0, 0.1, -0.23], armor);
  sphere(root, 0.12, [0, 0.68, 0]);
  box(root, [0.34, 0.3, 0.32], [0, 0.91, 0], white);
  box(root, [0.29, 0.075, 0.025], [0, 0.94, -0.172], visor);
  box(root, [0.13, 0.14, 0.045], [0, 0.82, -0.18], armor);
  box(root, [0.5, 0.44, 0.22], [0, 0.29, 0.32], joint);
  const jets: THREE.Mesh[] = [];
  for (const sign of [-1, 1]) {
    box(root, [0.16, 0.4, 0.22], [sign * 0.22, 0.26, 0.43], armor);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.48, 10), jet);
    flame.position.set(sign * 0.22, -0.12, 0.43); flame.rotation.z = Math.PI; flame.visible = false;
    root.add(flame); jets.push(flame);
  }
  const legs: THREE.Group[] = [], arms: THREE.Group[] = [];
  for (const sign of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(sign * 0.22, -0.29, 0); root.add(leg); legs.push(leg);
    sphere(leg, 0.12, [0, -0.02, 0]);
    box(leg, [0.27, 0.33, 0.28], [0, -0.2, 0], white);
    sphere(leg, 0.12, [0, -0.39, -0.015]);
    box(leg, [0.29, 0.32, 0.3], [0, -0.57, 0], armor);
    box(leg, [0.18, 0.12, 0.05], [0, -0.43, -0.18], white);
    box(leg, [0.32, 0.14, 0.47], [0, -0.73, -0.085], joint);
    const arm = new THREE.Group(); arm.position.set(sign * 0.5, 0.5, 0); root.add(arm); arms.push(arm);
    sphere(arm, 0.145, [0, 0, 0]);
    box(arm, [0.34, 0.2, 0.38], [sign * 0.025, 0.06, 0], armor);
    box(arm, [0.2, 0.3, 0.24], [0, -0.2, 0], white);
    sphere(arm, 0.105, [0, -0.38, -0.03]);
    const forearm = box(arm, [0.23, 0.27, 0.28], [-sign * 0.1, -0.43, -0.18], armor);
    forearm.rotation.x = -0.6;
    sphere(arm, 0.09, [-sign * 0.16, -0.43, -0.34]);
  }
  // Centered barrel follows the prototype server muzzle: root +0.48Y, forward -Z.
  const gun = new THREE.Group(); gun.position.set(0, 0.48, 0); root.add(gun);
  box(gun, [0.19, 0.18, 0.58], [0, 0, -0.4], joint);
  box(gun, [0.12, 0.075, 0.35], [0, 0.1, -0.43], armor);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.3, 10), joint);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0, -0.76); gun.add(barrel);
  const shellSocket = new THREE.Group(); shellSocket.position.set(0, 0.29, 0); root.add(shellSocket);
  return { root, shellSocket, legs, arms, jets, gun, phase: 0 };
}

interface Runtime {
  world: THREE.Scene;
  preview: MechVisual;
  players: Map<string, MechVisual>;
  shell: THREE.Group | null;
  attachShell(): void;
}

/** Honest compatibility map: the same snapshots, not a second physics simulation. */
function startFallback(canvas: HTMLCanvasElement, host: HTMLElement, latest: { current: SceneProps }) {
  const context = canvas.getContext('2d');
  if (!context) {
    latest.current.onRendererStatus('当前浏览器无法绘制舞台，请换用支持Canvas的浏览器。');
    return () => {};
  }
  const ctx = context;
  let width = 1, height = 1, ratio = 1, frame = 0, disposed = false;
  const resize = () => {
    width = Math.max(1, host.clientWidth); height = Math.max(1, host.clientHeight);
    ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
  };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  latest.current.onRendererStatus('当前设备无法启动3D，已切换俯视驾驶兼容模式；位置和弹丸仍由服务器计算。');
  const draw = () => {
    if (disposed) return;
    frame = requestAnimationFrame(draw);
    if (document.hidden) return;
    const snapshot = latest.current.snapshot;
    const own = snapshot?.players.find((p) => p.id === latest.current.playerId);
    const scale = height / 34;
    const centerX = own?.position.x ?? 0, centerZ = (own?.position.z ?? 6) - 6;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#e9eeec'; ctx.fillRect(0, 0, width, height);
    ctx.save(); ctx.translate(width / 2 - centerX * scale, height / 2 - centerZ * scale); ctx.scale(scale, scale);
    ctx.fillStyle = '#e1e5e1'; ctx.fillRect(-24, -24, 48, 48);
    ctx.strokeStyle = '#c9d3cc'; ctx.lineWidth = 1 / scale;
    for (let n = -24; n <= 24; n += 4) {
      ctx.beginPath(); ctx.moveTo(n, -24); ctx.lineTo(n, 24); ctx.moveTo(-24, n); ctx.lineTo(24, n); ctx.stroke();
    }
    ctx.strokeStyle = '#83968c'; ctx.lineWidth = 0.25; ctx.strokeRect(-24, -24, 48, 48);
    ctx.fillStyle = '#94a7a7'; for (const x of [-5, 5]) ctx.fillRect(x - 1.1, -2.1, 2.2, 2.2);
    for (const target of snapshot?.targets ?? []) {
      if (target.health <= 0) continue;
      ctx.fillStyle = '#d27863'; ctx.strokeStyle = '#f6f5ed'; ctx.lineWidth = 0.1;
      ctx.beginPath(); ctx.arc(target.position.x, target.position.z, target.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#6b463e'; ctx.lineWidth = 0.07;
      ctx.beginPath(); ctx.arc(target.position.x, target.position.z, target.radius + 0.16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * target.health / target.maxHealth); ctx.stroke();
    }
    for (const player of snapshot?.players ?? []) {
      ctx.save(); ctx.translate(player.position.x, player.position.z); ctx.rotate(-player.rotationYaw);
      ctx.fillStyle = player.id === latest.current.playerId ? '#3c7593' : '#d27863';
      ctx.strokeStyle = '#e9ede8'; ctx.lineWidth = 0.07;
      ctx.fillRect(-0.38, -0.38, 0.76, 0.76); ctx.strokeRect(-0.38, -0.38, 0.76, 0.76);
      ctx.fillRect(-0.7, -0.3, 0.22, 0.6); ctx.fillRect(0.48, -0.3, 0.22, 0.6);
      ctx.fillStyle = '#37484d'; ctx.fillRect(-0.08, -0.95, 0.16, 0.62);
      ctx.fillStyle = '#9ce2dc'; ctx.fillRect(-0.21, -0.35, 0.42, 0.12);
      if (player.boosting) {
        ctx.fillStyle = '#ffdfb2'; ctx.beginPath(); ctx.moveTo(-0.22, 0.4); ctx.lineTo(0, 1.1); ctx.lineTo(0.22, 0.4); ctx.fill();
      }
      ctx.restore();
    }
    for (const projectile of snapshot?.projectiles ?? []) {
      const speed = Math.hypot(projectile.velocity.x, projectile.velocity.z) || 1;
      ctx.strokeStyle = '#c8672c'; ctx.lineWidth = 0.13;
      ctx.beginPath(); ctx.moveTo(projectile.position.x, projectile.position.z);
      ctx.lineTo(projectile.position.x - projectile.velocity.x / speed * 0.55, projectile.position.z - projectile.velocity.z / speed * 0.55); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#37484d'; ctx.font = '12px system-ui,sans-serif';
    ctx.fillText('俯视驾驶 · 2D兼容模式', 18, 26);
    ctx.fillText(snapshot ? '服务器位置 / 目标 / 弹丸 · 图形降级不改变物理判定' : '连接训练或对战后，显示服务器比赛位置。', 18, height - 18);
  };
  frame = requestAnimationFrame(draw);
  return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); };
}

export const Scene = forwardRef<SceneHandle, SceneProps>(function Scene(props, ref) {
  const host = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef(props); latest.current = props;
  const view = useRef({ yaw: 0, pitch: 0 });
  const runtime = useRef<Runtime | null>(null);
  const [fallback, setFallback] = useState(false);

  useImperativeHandle(ref, () => ({
    setView(yaw, pitch) {
      if (Number.isFinite(yaw) && Number.isFinite(pitch)) view.current = { yaw, pitch: clamp(pitch, -0.65, 0.65) };
    },
  }), []);

  useEffect(() => {
    const element = canvas.current, container = host.current;
    if (!element || !container) return;
    if (fallback) return startFallback(element, container, latest);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: element, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch {
      setFallback(true);
      return;
    }
    const world = new THREE.Scene(); world.background = new THREE.Color(PALETTE.sky);
    world.fog = new THREE.Fog(PALETTE.sky, 26, 62);
    const camera = new THREE.PerspectiveCamera(51, 1, 0.08, 90);
    camera.position.set(3.4, 2.9, 4.9); camera.lookAt(0, 1.1, 0);
    world.add(new THREE.HemisphereLight(0xf6f5e9, 0x8c9f98, 2.2));
    const sun = new THREE.DirectionalLight(0xfff4df, 3.1); sun.position.set(-7, 14, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20; sun.shadow.bias = -0.0005; world.add(sun);
    const fill = new THREE.DirectionalLight(0xdceafd, 1.1); fill.position.set(6, 5, -10); world.add(fill);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: PALETTE.floor, roughness: 0.94 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(48, 48), floorMaterial);
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);
    const grid = new THREE.GridHelper(48, 24, PALETTE.line, 0xd0d9d2); grid.position.y = 0.006; world.add(grid);
    const coverMaterial = new THREE.MeshStandardMaterial({ color: 0x94a7a7, roughness: 0.72 });
    const wallMaterial = new THREE.MeshStandardMaterial({ color: PALETTE.wall, roughness: 0.86 });
    for (const x of [-5, 5]) {
      const cover = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2, 2.2), coverMaterial);
      cover.position.set(x, 1, -1); cover.castShadow = true; cover.receiveShadow = true; world.add(cover);
    }
    for (const [x, z, width, depth] of [[-24.25, 0, 0.5, 49], [24.25, 0, 0.5, 49], [0, -24.25, 48, 0.5], [0, 24.25, 48, 0.5]]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(width, 12, depth), wallMaterial); wall.position.set(x, 6, z); world.add(wall);
    }
    const preview = makeMech(PALETTE.blue); preview.root.position.set(0, 1.1, 0); world.add(preview.root);
    const players = new Map<string, MechVisual>();
    const targets = new Map<string, THREE.Group>();
    const bullets = new Map<string, THREE.Mesh>();
    const bulletGeometry = new THREE.SphereGeometry(0.075, 8, 6);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffc282 });
    const aim = new THREE.Mesh(new THREE.RingGeometry(0.09, 0.12, 24), new THREE.MeshBasicMaterial({ color: 0x386b76, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.85 }));
    aim.renderOrder = 20; aim.visible = false; world.add(aim);
    const state: Runtime = {
      world, preview, players, shell: null,
      attachShell() {
        if (!this.shell) return;
        const own = latest.current.playerId ? players.get(latest.current.playerId) : null;
        const next = own?.shellSocket ?? (!latest.current.snapshot ? preview.shellSocket : null);
        if (next && this.shell.parent !== next) next.add(this.shell);
      },
    };
    runtime.current = state;
    function targetVisual(id: string) {
      const group = new THREE.Group();
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.72, 20, 12), new THREE.MeshStandardMaterial({ color: PALETTE.coral, roughness: 0.42, metalness: 0.2 }));
      globe.castShadow = true; group.add(globe);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.035, 8, 24), new THREE.MeshStandardMaterial({ color: PALETTE.white, roughness: 0.5 }));
      ring.position.z = 0.55; group.add(ring); world.add(group); targets.set(id, group); return group;
    }
    targetVisual('preview-target').position.set(0, 1.45, -8);
    const resize = () => {
      const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    let disposed = false, lost = false, frameId = 0, previousTime = performance.now();
    const onLost = (event: Event) => { event.preventDefault(); lost = true; setFallback(true); };
    const onRestored = () => { lost = false; latest.current.onRendererStatus('3D舞台已恢复。'); };
    element.addEventListener('webglcontextlost', onLost); element.addEventListener('webglcontextrestored', onRestored);
    const forward = new THREE.Vector3(), follow = new THREE.Vector3(), look = new THREE.Vector3();
    const frame = (now: number) => {
      if (disposed) return;
      frameId = requestAnimationFrame(frame);
      if (lost || document.hidden) { previousTime = now; return; }
      const dt = Math.min((now - previousTime) / 1000, 0.05); previousTime = now;
      const snapshot = latest.current.snapshot;
      preview.root.visible = !snapshot;
      targets.get('preview-target')!.visible = !snapshot;
      const activePlayers = new Set(snapshot?.players.map((p) => p.id) ?? []);
      for (const [id, visual] of players) if (!activePlayers.has(id)) {
        if (state.shell?.parent === visual.shellSocket) visual.shellSocket.remove(state.shell);
        world.remove(visual.root); disposeObject(visual.root); players.delete(id);
      }
      for (const player of snapshot?.players ?? []) {
        let visual = players.get(player.id);
        if (!visual) {
          visual = makeMech(player.id === latest.current.playerId ? PALETTE.blue : PALETTE.coral);
          visual.root.position.copy(player.position); world.add(visual.root); players.set(player.id, visual);
        }
        visual.root.position.lerp(new THREE.Vector3(player.position.x, player.position.y, player.position.z), 1 - Math.exp(-dt * 20));
        const difference = Math.atan2(Math.sin(player.rotationYaw - visual.root.rotation.y), Math.cos(player.rotationYaw - visual.root.rotation.y));
        visual.root.rotation.y += difference * (1 - Math.exp(-dt * 20));
        const speed = Math.hypot(player.velocity.x, player.velocity.z);
        visual.phase += dt * Math.min(speed * 2, 10);
        visual.legs.forEach((leg, index) => { leg.rotation.x = player.grounded ? Math.sin(visual!.phase + index * Math.PI) * Math.min(speed / 9, 0.34) : -0.13; });
        visual.gun.rotation.x = player.aimPitch;
        visual.jets.forEach((flame) => { flame.visible = player.boosting; flame.scale.y = 0.85 + Math.sin(now * 0.05) * 0.15; });
      }
      state.attachShell();
      const activeTargets = new Set(snapshot?.targets.map((t) => t.id) ?? []);
      for (const [id, group] of targets) {
        if (id !== 'preview-target' && !activeTargets.has(id)) { world.remove(group); disposeObject(group); targets.delete(id); }
      }
      for (const target of snapshot?.targets ?? []) {
        const group = targets.get(target.id) ?? targetVisual(target.id);
        group.position.copy(target.position); group.scale.setScalar(target.radius / 0.72); group.visible = target.health > 0;
      }
      const activeBullets = new Set(snapshot?.projectiles.map((b) => b.id) ?? []);
      for (const [id, mesh] of bullets) if (!activeBullets.has(id)) { world.remove(mesh); bullets.delete(id); }
      for (const bullet of snapshot?.projectiles ?? []) {
        let mesh = bullets.get(bullet.id);
        if (!mesh) { mesh = new THREE.Mesh(bulletGeometry, bulletMaterial); world.add(mesh); bullets.set(bullet.id, mesh); }
        mesh.position.copy(bullet.position);
      }
      const own = snapshot?.players.find((p) => p.id === latest.current.playerId);
      aim.visible = Boolean(own && snapshot?.status !== 'finished');
      if (own) {
        const { yaw, pitch } = view.current;
        // Yaw zero faces -Z, so the chase camera is behind along +Z.
        follow.set(own.position.x + Math.sin(yaw) * 7, own.position.y + 3, own.position.z + Math.cos(yaw) * 7);
        camera.position.lerp(follow, 1 - Math.exp(-dt * 9));
        look.set(own.position.x - Math.sin(yaw) * 6, own.position.y + 0.7 + Math.tan(pitch) * 9, own.position.z - Math.cos(yaw) * 6);
        camera.lookAt(look);
        forward.set(-Math.sin(own.rotationYaw) * Math.cos(own.aimPitch), Math.sin(own.aimPitch), -Math.cos(own.rotationYaw) * Math.cos(own.aimPitch));
        aim.position.copy(own.position).add(new THREE.Vector3(0, 0.48, 0)).addScaledVector(forward, 18);
        aim.quaternion.copy(camera.quaternion);
      } else {
        camera.position.lerp(follow.set(3.4, 2.9, 4.9), 1 - Math.exp(-dt * 6)); camera.lookAt(0, 1.05, 0);
      }
      renderer.render(world, camera);
    };
    frameId = requestAnimationFrame(frame);
    latest.current.onRendererStatus('3D舞台已就绪 · 原创标准机架');
    return () => {
      disposed = true; cancelAnimationFrame(frameId); observer.disconnect();
      element.removeEventListener('webglcontextlost', onLost); element.removeEventListener('webglcontextrestored', onRestored);
      if (runtime.current === state) runtime.current = null;
      if (state.shell) { state.shell.removeFromParent(); disposeObject(state.shell); }
      disposeObject(world); bulletGeometry.dispose(); bulletMaterial.dispose(); sun.shadow.dispose();
      renderer.renderLists.dispose(); renderer.dispose();
      // React StrictMode immediately recreates this effect on the same canvas.
      // Only lose the context if that canvas really went away or stayed unused.
      queueMicrotask(() => {
        if (canvas.current !== element || runtime.current === null) renderer.forceContextLoss();
      });
    };
  }, [fallback]);

  useEffect(() => {
    let cancelled = false;
    const state = runtime.current;
    if (!state) {
      if (fallback && props.importedFile) latest.current.onImportStatus('当前俯视兼容模式不显示GLB外观；原文件仍在本机，标准机架与服务器对战不受影响。');
      return;
    }
    if (state.shell) { state.shell.removeFromParent(); disposeObject(state.shell); state.shell = null; }
    if (!props.importedFile) return;
    const file = props.importedFile;
    latest.current.onImportStatus('正在本机检查GLB，文件不会上传。');
    void (async () => {
      let imported: THREE.Group | null = null;
      try {
        if (file.size > MAX_GLB_BYTES) rejectImport('文件超过20MB；请先简化模型。');
        const bytes = await file.arrayBuffer();
        if (cancelled) return;
        validateGlbBuffer(bytes);
        const manager = new THREE.LoadingManager();
        manager.setURLModifier((url) => {
          if (!url.startsWith('blob:')) rejectImport('已阻止模型请求外部资源。');
          return url;
        });
        const gltf = await new GLTFLoader(manager).parseAsync(bytes, '');
        imported = gltf.scene;
        if (cancelled || runtime.current !== state) { disposeObject(imported); return; }
        imported.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true; object.receiveShadow = true; object.frustumCulled = true;
            for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
              material.transparent = false; material.opacity = 1; material.alphaTest = 0; material.depthWrite = true; material.colorWrite = true;
            }
          }
        });
        const bounds = new THREE.Box3().setFromObject(imported);
        const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
        if (![size.x, size.y, size.z, center.x, center.y, center.z].every(Number.isFinite) || Math.max(size.x, size.y, size.z) < 1e-6) rejectImport('模型没有可见且有限的几何尺寸。');
        const shell = new THREE.Group();
        imported.position.sub(center); shell.add(imported);
        shell.scale.setScalar(Math.min(0.82 / Math.max(size.x, 1e-6), 0.62 / Math.max(size.y, 1e-6), 0.5 / Math.max(size.z, 1e-6)));
        state.shell = shell; state.attachShell(); imported = null;
        latest.current.onImportStatus(`${file.name} 已作为本机躯干外壳预览；标准机架、服务器碰撞与战斗参数保持不变。`);
      } catch (error) {
        if (imported) disposeObject(imported);
        if (!cancelled) latest.current.onImportStatus(`导入未完成，保留标准机体。${error instanceof Error ? error.message : '请检查静态GLB格式。'}`);
      }
    })();
    return () => { cancelled = true; };
  }, [props.importedFile, fallback]);

  return <VStack ref={host} width="100%" height="100%" minHeight={380} gap={0}>
    <canvas key={fallback ? 'compatible-2d' : 'webgl-3d'} ref={canvas} role="img" aria-label={fallback ? '俯视驾驶兼容模式：根据服务器快照显示机体、目标和弹丸，不提供GLB外观预览。' : '原创机体3D竞技场。画面位置、目标与弹丸来自服务器快照；导入外壳仅在本机显示。'} />
  </VStack>;
});

export default Scene;
