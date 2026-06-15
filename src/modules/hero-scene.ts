/**
 * Hero workflow-graph scene.
 * This module is dynamically imported so three.js (~150 KB gz) loads as a
 * separate chunk after first paint — the page is interactive before 3D exists.
 */
import * as THREE from "three";
import { isMobileViewport, prefersReducedMotion } from "../config";

interface FlowParticle {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  speed: number;
}

export function initHeroScene(canvas: HTMLCanvasElement): void {
  const mobile = isMobileViewport();
  const reduced = prefersReducedMotion();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    55, window.innerWidth / window.innerHeight, 0.1, 100
  );
  camera.position.z = 14;

  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: !mobile,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const group = new THREE.Group();
  scene.add(group);

  // nodes
  const NODE_COUNT = mobile ? 10 : 16;
  const nodes: THREE.Vector3[] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push(new THREE.Vector3(
      (Math.random() - 0.5) * 16,
      (Math.random() - 0.5) * 9,
      (Math.random() - 0.5) * 6
    ));
  }
  const nodeGeo = new THREE.SphereGeometry(0.09, 10, 10);
  const cyan = new THREE.MeshBasicMaterial({ color: 0x5ed3f0 });
  const amber = new THREE.MeshBasicMaterial({ color: 0xffb454 });
  nodes.forEach((p, idx) => {
    const m = new THREE.Mesh(nodeGeo, idx % 5 === 0 ? amber : cyan);
    m.position.copy(p);
    group.add(m);
  });

  // edges: each node to its 2 nearest neighbours
  const edges: Array<[number, number]> = [];
  const seen = new Set<string>();
  for (let i = 0; i < nodes.length; i++) {
    const dists = nodes
      .map((_, j) => ({ j, d: i === j ? Infinity : nodes[i].distanceTo(nodes[j]) }))
      .sort((a, b) => a.d - b.d);
    for (let k = 0; k < 2; k++) {
      const a = Math.min(i, dists[k].j);
      const b = Math.max(i, dists[k].j);
      const key = `${a}-${b}`;
      if (!seen.has(key)) { seen.add(key); edges.push([a, b]); }
    }
  }
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x1d3a5c, transparent: true, opacity: 0.85,
  });
  edges.forEach(([a, b]) => {
    const g = new THREE.BufferGeometry().setFromPoints([nodes[a], nodes[b]]);
    group.add(new THREE.Line(g, lineMat));
  });

  // flow particles
  const PER_EDGE = mobile ? 1 : 2;
  const particles: FlowParticle[] = [];
  const partGeo = new THREE.SphereGeometry(0.045, 8, 8);
  const partMat = new THREE.MeshBasicMaterial({
    color: 0x5ed3f0, transparent: true, opacity: 0.95,
  });
  edges.forEach(([a, b]) => {
    for (let p = 0; p < PER_EDGE; p++) {
      const mesh = new THREE.Mesh(partGeo, partMat);
      particles.push({
        mesh, from: nodes[a], to: nodes[b],
        t: Math.random(), speed: 0.0018 + Math.random() * 0.0028,
      });
      group.add(mesh);
    }
  });

  // gentle mouse parallax (desktop only)
  let targetRX = 0, targetRY = 0;
  if (!mobile) {
    window.addEventListener("mousemove", (ev: MouseEvent) => {
      targetRY = (ev.clientX / window.innerWidth - 0.5) * 0.25;
      targetRX = (ev.clientY / window.innerHeight - 0.5) * 0.18;
    }, { passive: true });
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const tick = (): void => {
    if (!reduced) {
      group.rotation.y += 0.0008;
      group.rotation.y += (targetRY - group.rotation.y) * 0.03;
      group.rotation.x += (targetRX - group.rotation.x) * 0.03;
      for (const pt of particles) {
        pt.t += pt.speed;
        if (pt.t > 1) pt.t = 0;
        pt.mesh.position.lerpVectors(pt.from, pt.to, pt.t);
      }
    }
    renderer.render(scene, camera);
    if (!reduced) requestAnimationFrame(tick);
  };
  tick(); // reduced-motion users get one fully rendered static frame
}
