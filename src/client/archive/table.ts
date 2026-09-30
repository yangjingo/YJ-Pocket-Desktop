import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { finish } from './objects';

type Size = [number, number, number];
type Point = [number, number, number];

function part(parent: THREE.Object3D, size: Size, at: Point, material: THREE.Material, radius = .035) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 2, radius), material);
  mesh.position.set(...at); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}

function tableTop(moving: THREE.Group) {
  part(moving, [13.75, .26, 2.55], [0, -1.91, 0], finish.aluminium, .075);
  part(moving, [13.49, .022, 2.28], [0, -1.765, 0], finish.steel, .025);
  part(moving, [13.61, .035, .07], [0, -1.81, 1.26], finish.highlight, .012);
  part(moving, [13.48, .11, .025], [0, -1.95, 1.282], finish.graphite, .009);
  part(moving, [10.35, .14, .34], [0, -2.1, 0], finish.steel, .035);
  part(moving, [1.14, .065, .028], [0, -1.95, 1.307], finish.black, .009);
  for (const x of [-6.56, -4.64, 4.64, 6.56]) {
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(.047, .047, .02, 16), finish.highlight);
    bolt.rotation.x = Math.PI / 2; bolt.position.set(x, -1.95, 1.304); moving.add(bolt);
  }
  for (const x of [-.18, 0, .18]) part(moving, [.065, .026, .018], [x, -1.95, 1.329], finish.amber, .009);
}

function leg(scene: THREE.Scene, x: number) {
  part(scene, [.83, .13, 2.52], [x, -3.28, 0], finish.graphite, .055);
  for (const z of [-1.1, 1.1]) part(scene, [.68, .055, .23], [x, -3.36, z], finish.black, .016);
  part(scene, [.64, 1.01, .56], [x, -2.8, 0], finish.steel, .05);
  part(scene, [.68, .085, .59], [x, -2.34, 0], finish.graphite, .021);
  return part(scene, [.5, 1, .43], [x, -2.35, 0], finish.aluminium, .035);
}

export function createArchiveTable(scene: THREE.Scene) {
  const moving = new THREE.Group(); scene.add(moving); tableTop(moving);
  const sleeves = [-4.75, 0, 4.75].map(x => leg(scene, x));
  function setHeight(offset: number) {
    moving.position.y = offset;
    for (const sleeve of sleeves) {
      sleeve.scale.y = .66 + offset;
      sleeve.position.y = -2.35 + offset / 2;
    }
  }
  return { moving, setHeight };
}
