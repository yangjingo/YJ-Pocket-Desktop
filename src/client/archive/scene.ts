import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createArchiveObjects, finish, type ArchiveId } from './objects';
import { createArchiveTable } from './table';

const order: ArchiveId[] = ['photos', 'videos', 'music', 'recordings', 'files'];
type Exhibit = { id: ArchiveId; button: HTMLButtonElement; root: THREE.Group; targetX: number; targetScale: number };
type LiftControls = { lower: HTMLButtonElement; raise: HTMLButtonElement; readout: HTMLOutputElement };
const liftMinimum = 72, liftMaximum = 112, liftStep = 4;

function plinth(id: ArchiveId) {
  const base = new THREE.Group();
  const metal = finish.aluminium, lip = finish.highlight;
  const well = finish.graphite, light = finish.amber;
  const foot = new THREE.Mesh(new RoundedBoxGeometry(2.24, .36, 1.64, 2, .09), metal);
  foot.position.y = -1.6; foot.castShadow = true; foot.receiveShadow = true; base.add(foot);
  const edge = new THREE.Mesh(new RoundedBoxGeometry(2.13, .045, 1.53, 2, .016), lip);
  edge.position.y = -1.395; base.add(edge);
  const inset = new THREE.Mesh(new RoundedBoxGeometry(2.02, .022, 1.43, 2, .012), well);
  inset.position.y = -1.358; base.add(inset);
  const indicator = new THREE.Mesh(new THREE.SphereGeometry(.038, 12, 8), light);
  indicator.position.set(-.91, -1.59, .838); base.add(indicator);
  for (const x of [-1.02, 1.02]) {
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(.042, .042, .02, 16), lip);
    bolt.rotation.x = Math.PI / 2; bolt.position.set(x, -1.61, .831); base.add(bolt);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(.048, .006, .006), well);
    slot.position.set(x, -1.61, .849); slot.rotation.z = -.4; base.add(slot);
  }
  base.userData.stageId = id;
  return base;
}

function makeExhibits(parent: THREE.Group, buttons: Record<ArchiveId, HTMLButtonElement>): Exhibit[] {
  const objects = createArchiveObjects();
  return order.map(id => {
    const root = plinth(id), model = objects[id];
    model.position.y = id === 'recordings' || id === 'files' ? -.05 : -.18;
    root.add(model); root.userData.stageId = id; parent.add(root);
    return { id, button: buttons[id], root, targetX: 0, targetScale: 1 };
  });
}

function lights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0xf4f4f1, 0x3b3b3b, 1.9));
  const key = new THREE.DirectionalLight(0xffffff, 3.6);
  key.position.set(-5, 9, 8); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -10; key.shadow.camera.right = 10;
  key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
  key.shadow.bias = -.0003; scene.add(key);
  const rim = new THREE.DirectionalLight(0xf3f3f1, 1.9);
  rim.position.set(7, 4, -6); scene.add(rim);
  const bounce = new THREE.PointLight(0xffffff, 10, 22);
  bounce.position.set(0, 1, 7); scene.add(bounce);
}

function floor(scene: THREE.Scene) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(32, 18), new THREE.MeshStandardMaterial({ color: 0xb9bab8, metalness: .25, roughness: .72 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -3.39; ground.receiveShadow = true; scene.add(ground);
  const grid = new THREE.GridHelper(30, 30, 0x777777, 0x777777);
  grid.position.y = -3.385; (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = .065; scene.add(grid);
}

export function mountArchiveScene(canvas: HTMLCanvasElement, buttons: Record<ArchiveId, HTMLButtonElement>, controls: LiftControls) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.24;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  lights(scene); floor(scene);
  const table = createArchiveTable(scene), exhibits = makeExhibits(table.moving, buttons);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(), motion = matchMedia('(prefers-reduced-motion: reduce)');
  let focused = 2, hovered: ArchiveId | null = null, frame = 0, pointerStartX = 0;
  let height = 84, currentLift = .18, targetLift = .18;
  table.setHeight(currentLift);

  function render() { renderer.render(scene, camera); }

  function requestFrame() {
    if (!frame && !document.hidden && !motion.matches) frame = requestAnimationFrame(animate);
  }

  function layout() {
    const narrow = innerWidth < 700;
    camera.fov = narrow ? 37 : 34; camera.aspect = innerWidth / innerHeight;
    camera.position.set(0, narrow ? 2.5 : 3.25, narrow ? 11.5 : innerWidth < 1050 ? 17.5 : 15.5);
    camera.lookAt(0, narrow ? -.52 : -1.0, 0); camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    exhibits.forEach((exhibit, index) => {
      const distance = index - focused;
      exhibit.targetX = narrow ? distance * 2.65 : (index - 2) * 2.65;
      exhibit.targetScale = narrow ? (distance === 0 ? 1.13 : .79) : 1;
      exhibit.root.visible = !exhibit.button.hidden && (!narrow || Math.abs(distance) <= 1);
      exhibit.button.classList.toggle('is-focused', index === focused);
    });
    if (motion.matches) {
      currentLift = targetLift; table.setHeight(currentLift);
      exhibits.forEach(exhibit => { exhibit.root.position.x = exhibit.targetX; exhibit.root.scale.setScalar(exhibit.targetScale); }); render();
    } else requestFrame();
  }

  function setHeight(next: number) {
    height = Math.max(liftMinimum, Math.min(liftMaximum, next));
    targetLift = (height - liftMinimum) / (liftMaximum - liftMinimum) * .6;
    controls.readout.value = String(height);
    controls.lower.disabled = height === liftMinimum; controls.raise.disabled = height === liftMaximum;
    if (motion.matches) { currentLift = targetLift; table.setHeight(currentLift); render(); }
    else requestFrame();
  }

  function focus(index: number) {
    focused = Math.max(0, Math.min(order.length - 1, index)); layout();
  }

  function hover(id: ArchiveId | null) {
    if (hovered === id) return;
    hovered = id; canvas.style.cursor = id ? 'pointer' : 'default';
    exhibits.forEach(exhibit => { exhibit.button.classList.toggle('is-hovered', exhibit.id === id); });
    if (motion.matches) render(); else requestFrame();
  }

  function hit(event: PointerEvent): ArchiveId | null {
    const bounds = canvas.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
    raycaster.setFromCamera(pointer, camera);
    const roots = exhibits.filter(exhibit => exhibit.root.visible).map(exhibit => exhibit.root);
    const result = raycaster.intersectObjects(roots, true)[0];
    let node: THREE.Object3D | null = result?.object ?? null;
    while (node && !node.userData.stageId) node = node.parent;
    return node?.userData.stageId as ArchiveId | null ?? null;
  }

  function animate(now: number) {
    frame = 0;
    if (document.hidden || motion.matches) return;
    let moving = Math.abs(targetLift - currentLift) > .002;
    currentLift += (targetLift - currentLift) * .1; table.setHeight(currentLift);
    exhibits.forEach((exhibit, index) => {
      const active = hovered === exhibit.id;
      if (Math.abs(exhibit.targetX - exhibit.root.position.x) > .002 ||
        Math.abs((active ? .16 : 0) - exhibit.root.position.y) > .002 ||
        Math.abs(exhibit.targetScale - exhibit.root.scale.x) > .002) moving = true;
      exhibit.root.position.x += (exhibit.targetX - exhibit.root.position.x) * .1;
      exhibit.root.position.y += ((active ? .16 : 0) - exhibit.root.position.y) * .12;
      const scale = exhibit.root.scale.x + (exhibit.targetScale - exhibit.root.scale.x) * .1;
      exhibit.root.scale.setScalar(scale);
      const angle = (index - 2) * -.09 + (hovered ? Math.sin(now * .0005 + index) * .025 : 0) + (active ? .11 : 0);
      if (Math.abs(angle - exhibit.root.rotation.y) > .002) moving = true;
      exhibit.root.rotation.y += (angle - exhibit.root.rotation.y) * .08;
    });
    render();
    if (moving || hovered) requestFrame();
  }

  canvas.addEventListener('pointermove', event => hover(hit(event)));
  controls.lower.addEventListener('click', () => setHeight(height - liftStep));
  controls.raise.addEventListener('click', () => setHeight(height + liftStep));
  canvas.addEventListener('pointerleave', () => hover(null));
  canvas.addEventListener('pointerdown', event => { pointerStartX = event.clientX; });
  canvas.addEventListener('pointerup', event => {
    if (innerWidth < 700 && Math.abs(event.clientX - pointerStartX) > 42) {
      focus(focused + (event.clientX < pointerStartX ? 1 : -1)); return;
    }
    const id = hit(event); if (id) { focus(order.indexOf(id)); buttons[id].click(); }
  });
  exhibits.forEach((exhibit, index) => {
    exhibit.button.addEventListener('pointerenter', () => { hover(exhibit.id); if (innerWidth < 700) focus(index); });
    exhibit.button.addEventListener('pointerleave', () => hover(null));
    exhibit.button.addEventListener('focus', () => { hover(exhibit.id); focus(index); });
    exhibit.button.addEventListener('blur', () => hover(null));
    exhibit.button.addEventListener('click', () => focus(index));
    new MutationObserver(layout).observe(exhibit.button, { attributes: true, attributeFilter: ['hidden'] });
  });
  addEventListener('resize', layout);
  document.addEventListener('visibilitychange', () => { cancelAnimationFrame(frame); frame = 0; if (!document.hidden) requestFrame(); });
  motion.addEventListener('change', () => { cancelAnimationFrame(frame); frame = 0; layout(); });
  setHeight(height); layout(); canvas.dataset.scene = 'ready'; requestFrame();
}
