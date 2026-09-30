import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type ArchiveId = 'photos' | 'videos' | 'music' | 'recordings' | 'files';

function brushedSurface() {
  const size = 128, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const index = (y * size + x) * 4;
    const stripe = ((y * 73) % 23) - 11, fleck = ((x * 29 + y * 17) % 11) - 5;
    const value = 127 + stripe + fleck;
    pixels[index] = value; pixels[index + 1] = value; pixels[index + 2] = value; pixels[index + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2); texture.needsUpdate = true;
  return texture;
}

const brush = brushedSurface();
export const finish = {
  aluminium: new THREE.MeshStandardMaterial({ color: 0xc9cac8, metalness: .55, roughness: .43, bumpMap: brush, bumpScale: .025 }),
  highlight: new THREE.MeshStandardMaterial({ color: 0xf0f0ed, metalness: .49, roughness: .37, bumpMap: brush, bumpScale: .018 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x999a98, metalness: .6, roughness: .46, bumpMap: brush, bumpScale: .03 }),
  graphite: new THREE.MeshStandardMaterial({ color: 0x353636, metalness: .34, roughness: .48 }),
  black: new THREE.MeshStandardMaterial({ color: 0x121313, metalness: .13, roughness: .42 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x292a2a, metalness: .3, roughness: .13, clearcoat: .9 }),
  amber: new THREE.MeshStandardMaterial({ color: 0xd8a04a, metalness: .48, roughness: .31, emissive: 0x6b3c0b, emissiveIntensity: .22 }),
  paper: new THREE.MeshStandardMaterial({ color: 0xe9e9e5, metalness: 0, roughness: .82 }),
  image: new THREE.MeshStandardMaterial({ color: 0xa8a9a6, metalness: .08, roughness: .72 }),
  vinyl: new THREE.MeshStandardMaterial({ color: 0x101010, metalness: .18, roughness: .24 }),
};

function box(parent: THREE.Group, size: [number, number, number], at: [number, number, number], material: THREE.Material, radius = .04) {
  const bevel = Math.min(radius, ...size.map(value => value / 2));
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 2, bevel), material);
  mesh.position.set(...at); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
  return mesh;
}

function disc(parent: THREE.Group, radius: number, depth: number, at: [number, number, number], material: THREE.Material, front = false) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 40), material);
  mesh.position.set(...at); if (front) mesh.rotation.x = Math.PI / 2;
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
  return mesh;
}

function ring(parent: THREE.Group, radius: number, tube: number, at: [number, number, number], material: THREE.Material, horizontal = false) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 56), material);
  mesh.position.set(...at); if (horizontal) mesh.rotation.x = Math.PI / 2;
  parent.add(mesh); return mesh;
}

function rod(parent: THREE.Group, from: [number, number, number], to: [number, number, number], radius: number, material: THREE.Material) {
  const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to);
  const direction = end.clone().sub(start);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 10), material);
  mesh.position.copy(start.add(end).multiplyScalar(.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true; parent.add(mesh); return mesh;
}

function screw(parent: THREE.Group, x: number, y: number, z: number) {
  disc(parent, .045, .018, [x, y, z], finish.highlight, true);
  box(parent, [.047, .007, .009], [x, y, z + .014], finish.graphite, .003).rotation.z = -.35;
}

function camera() {
  const object = new THREE.Group();
  box(object, [1.85, 1.18, .79], [0, -.42, 0], finish.aluminium, .16);
  box(object, [1.75, .22, .74], [0, .19, 0], finish.highlight, .08);
  box(object, [.35, .78, .15], [.69, -.49, .43], finish.graphite, .07);
  box(object, [.46, .31, .22], [-.53, .34, -.04], finish.steel, .05);
  box(object, [.23, .13, .11], [-.53, .35, .13], finish.glass, .02);
  disc(object, .5, .14, [-.17, -.39, .47], finish.graphite, true);
  disc(object, .39, .19, [-.17, -.39, .58], finish.steel, true);
  ring(object, .31, .028, [-.17, -.39, .69], finish.highlight);
  disc(object, .27, .03, [-.17, -.39, .7], finish.glass, true);
  disc(object, .09, .045, [-.22, -.32, .73], finish.black, true);
  disc(object, .085, .07, [.53, .24, .2], finish.amber);
  screw(object, -.8, -.9, .41); screw(object, .79, -.9, .41);
  box(object, [.94, 1.04, .055], [.47, .68, -.22], finish.paper, .025).rotation.z = -.16;
  box(object, [.73, .66, .06], [.48, .75, -.18], finish.image, .015).rotation.z = -.16;
  return object;
}

function filmReel(parent: THREE.Group, x: number) {
  disc(parent, .42, .15, [x, .66, .08], finish.graphite, true);
  ring(parent, .35, .022, [x, .66, .175], finish.highlight);
  disc(parent, .11, .03, [x, .66, .18], finish.steel, true);
  for (let angle = 0; angle < 3; angle++) {
    const spoke = box(parent, [.06, .54, .025], [x, .66, .19], finish.steel, .015);
    spoke.rotation.z = angle * Math.PI / 3;
  }
}

function videoCamera() {
  const object = new THREE.Group();
  box(object, [1.72, 1.06, .83], [0, -.53, 0], finish.steel, .13);
  box(object, [1.51, .81, .045], [0, -.52, .45], finish.graphite, .04);
  box(object, [.65, .28, .25], [-.6, -.44, .55], finish.black, .03);
  filmReel(object, -.48); filmReel(object, .49);
  disc(object, .34, .28, [.56, -.5, .65], finish.aluminium, true);
  ring(object, .26, .03, [.56, -.5, .83], finish.graphite);
  disc(object, .21, .03, [.56, -.5, .85], finish.glass, true);
  box(object, [.63, .12, .16], [.78, -.96, -.04], finish.aluminium, .035);
  box(object, [.47, .08, .11], [-.64, .06, -.13], finish.aluminium, .025);
  disc(object, .07, .04, [-.63, -.87, .48], finish.amber, true);
  screw(object, -.74, -.92, .47); screw(object, .74, -.92, .47);
  return object;
}

function turntable() {
  const object = new THREE.Group();
  box(object, [2.1, .33, 1.54], [0, -1.02, 0], finish.steel, .1);
  box(object, [1.95, .06, 1.39], [0, -.82, 0], finish.graphite, .05);
  box(object, [2.03, 1.25, .11], [0, -.19, -.7], finish.aluminium, .09);
  box(object, [1.78, .99, .025], [0, -.19, -.625], finish.graphite, .035);
  for (let index = 0; index < 6; index++) box(object, [1.49, .014, .016], [0, -.52 + index * .12, -.6], finish.steel, .004);
  disc(object, .65, .09, [-.36, -.73, .05], finish.vinyl);
  for (const radius of [.39, .47, .55]) ring(object, radius, .006, [-.36, -.67, .05], finish.steel, true);
  disc(object, .18, .012, [-.36, -.67, .05], finish.amber);
  disc(object, .055, .026, [-.36, -.65, .05], finish.graphite);
  disc(object, .12, .12, [.72, -.68, -.42], finish.aluminium);
  rod(object, [.72, -.58, -.42], [.63, -.58, .34], .028, finish.highlight);
  rod(object, [.63, -.58, .34], [.15, -.56, .46], .025, finish.highlight);
  box(object, [.21, .1, .14], [.12, -.55, .47], finish.graphite, .025);
  disc(object, .09, .1, [.72, -.7, .5], finish.amber);
  screw(object, -.92, -1.07, .79); screw(object, .92, -1.07, .79);
  return object;
}

function recorder() {
  const object = new THREE.Group();
  box(object, [1.08, 1.98, .47], [0, -.31, 0], finish.steel, .17);
  box(object, [.94, 1.8, .045], [0, -.31, .26], finish.aluminium, .1);
  box(object, [.84, .53, .07], [0, .37, .3], finish.graphite, .055);
  for (let index = 0; index < 8; index++) box(object, [.66, .018, .014], [0, .55 - index * .052, .34], finish.steel, .004);
  box(object, [.75, .31, .035], [0, -.23, .32], finish.black, .025);
  for (let index = 0; index < 5; index++) box(object, [.035, .045 + (index % 3) * .04, .017], [-.25 + index * .12, -.23, .35], finish.amber, .008);
  disc(object, .18, .07, [0, -.76, .32], finish.graphite, true);
  disc(object, .115, .08, [0, -.76, .37], finish.amber, true);
  disc(object, .075, .07, [-.31, -.75, .32], finish.highlight, true);
  disc(object, .075, .07, [.31, -.75, .32], finish.highlight, true);
  box(object, [.5, .12, .24], [0, .77, 0], finish.graphite, .045);
  screw(object, -.43, -.99, .29); screw(object, .43, -.99, .29);
  return object;
}

function cabinet() {
  const object = new THREE.Group();
  box(object, [1.7, 1.67, .94], [0, -.5, 0], finish.steel, .09);
  box(object, [1.56, 1.53, .035], [0, -.5, .49], finish.graphite, .035);
  for (let index = 0; index < 3; index++) {
    const y = .01 - index * .51;
    box(object, [1.4, .43, .055], [0, y, .54], finish.aluminium, .04);
    box(object, [.48, .055, .065], [0, y + .03, .6], finish.graphite, .019);
    box(object, [.41, .018, .025], [0, y + .045, .647], finish.highlight, .008);
    box(object, [.28, .11, .016], [0, y - .12, .58], finish.paper, .008);
  }
  box(object, [1.32, .045, .75], [0, .35, -.04], finish.highlight, .018);
  box(object, [.74, .46, .035], [.27, .56, -.17], finish.paper, .01).rotation.z = .11;
  box(object, [.75, .39, .035], [-.14, .53, -.21], finish.paper, .01).rotation.z = -.09;
  disc(object, .06, .025, [.69, .28, .52], finish.amber, true);
  screw(object, -.73, .24, .51); screw(object, -.73, -1.22, .51);
  return object;
}

export function createArchiveObjects(): Record<ArchiveId, THREE.Group> {
  return { photos: camera(), videos: videoCamera(), music: turntable(), recordings: recorder(), files: cabinet() };
}
