import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Palette roughly matching the app's Tailwind colours.
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6', '#14b8a6'];

/**
 * Renders each word onto its own 2D canvas, then uses that canvas as a WebGL
 * texture on a sprite. This keeps text crisp and avoids loading any external
 * font files — the browser rasterises the text, WebGL composites it in 3D.
 */
function makeWordTexture(text, color) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const fontSize = 64; // render large, scale the sprite down for sharpness
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  ctx.font = `bold ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  const metrics = ctx.measureText(text);
  const padding = 16;
  const w = Math.ceil(metrics.width) + padding * 2;
  const h = fontSize + padding * 2;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  // Re-apply after resize (resizing a canvas resets its context state)
  ctx.font = `bold ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, w / 2, h / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.anisotropy = 4;
  return { texture, aspect: w / h };
}

/** Evenly distribute N points over a sphere (Fibonacci lattice). */
function fibonacciSphere(i, n, radius) {
  const offset = n > 1 ? (i / (n - 1)) * 2 - 1 : 0; // -1 … 1
  const y = -offset;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
  const theta = phi * i;
  return new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius);
}

function WordCloud3D({ words = [], height = 380 }) {
  const mountRef = useRef(null);

  // Only rebuild the scene when the word data actually changes (the parent
  // re-polls every 2s and usually gets identical data).
  const signature = useMemo(
    () => words.map((w) => `${w.text}:${w.value}`).join('|'),
    [words]
  );

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || words.length === 0) return undefined;

    const width = mount.clientWidth || 600;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 5;
    controls.maxDistance = 16;

    // Build the sprite cloud
    const group = new THREE.Group();
    const maxValue = words.reduce((m, w) => Math.max(m, w.value), 1);
    const disposables = [];

    words.forEach((w, i) => {
      const color = COLORS[i % COLORS.length];
      const { texture, aspect } = makeWordTexture(w.text, color);
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
      const sprite = new THREE.Sprite(material);

      // Size scales with how often the word was submitted (0.55 … 1.6)
      const weight = w.value / maxValue;
      const scale = 0.55 + weight * 1.05;
      sprite.scale.set(scale * aspect, scale, 1);
      sprite.position.copy(fibonacciSphere(i, words.length, 3.4));

      group.add(sprite);
      disposables.push(texture, material);
    });
    scene.add(group);

    // Animation loop — slow auto-rotation, damped by user interaction
    let frameId;
    const clock = new THREE.Clock();
    const animate = () => {
      const dt = clock.getDelta();
      group.rotation.y += dt * 0.18;
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    // Keep it responsive
    const handleResize = () => {
      const w2 = mount.clientWidth || width;
      camera.aspect = w2 / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup: release GPU resources so repeated renders don't leak
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      disposables.forEach((d) => d.dispose());
      scene.clear();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, height]);

  if (words.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-slate-900"
        style={{ height }}
      >
        <p className="text-slate-400">Waiting for the first words…</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slateink via-slateink-800 to-slateink-900">
      <div ref={mountRef} style={{ height }} />
      <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-slate-400">
        drag to rotate · scroll to zoom
      </span>
    </div>
  );
}

export default WordCloud3D;
