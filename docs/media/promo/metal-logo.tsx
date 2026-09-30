import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import * as THREE from 'three';

const roundedPlate = new THREE.Shape();
const half = 1.72;
const radius = 0.3;
roundedPlate.moveTo(-half + radius, -half);
roundedPlate.lineTo(half - radius, -half);
roundedPlate.quadraticCurveTo(half, -half, half, -half + radius);
roundedPlate.lineTo(half, half - radius);
roundedPlate.quadraticCurveTo(half, half, half - radius, half);
roundedPlate.lineTo(-half + radius, half);
roundedPlate.quadraticCurveTo(-half, half, -half, half - radius);
roundedPlate.lineTo(-half, -half + radius);
roundedPlate.quadraticCurveTo(-half, -half, -half + radius, -half);

const extrusion = { depth: 0.23, bevelEnabled: true, bevelThickness: 0.085, bevelSize: 0.075, bevelSegments: 5, steps: 1 };
const arms = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4];

const BadgeObject = ({ settle }: { settle: number }) => {
  const frame = useCurrentFrame();
  const rotationY = interpolate(frame, [0, 115], [-0.49, -0.27], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <group rotation={[-0.22 + settle * 0.08, rotationY, -0.08 + settle * 0.06]} position={[0, 0, 0]} scale={0.89 + settle * 0.11}>
    <mesh castShadow receiveShadow>
      <extrudeGeometry args={[roundedPlate, extrusion]} />
      <meshPhysicalMaterial color="#e2e4df" metalness={0.52} roughness={0.24} clearcoat={0.42} clearcoatRoughness={0.17} />
    </mesh>
    <mesh position={[0, 0, 0.325]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[1.17, 1.17, 0.065, 72]} />
      <meshStandardMaterial color="#626563" metalness={0.72} roughness={0.31} />
    </mesh>
    <mesh position={[0, 0, 0.369]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[1.035, 1.035, 0.045, 72]} />
      <meshStandardMaterial color="#222625" metalness={0.34} roughness={0.47} />
    </mesh>
    <mesh position={[0, 0, 0.404]}>
      <torusGeometry args={[1.06, 0.024, 10, 72]} />
      <meshStandardMaterial color="#eef0eb" metalness={0.54} roughness={0.16} />
    </mesh>
    {arms.map((angle) => <mesh key={angle} position={[0, 0, 0.43]} rotation={[0, 0, angle]} castShadow>
      <boxGeometry args={[1.35, 0.085, 0.075]} />
      <meshStandardMaterial color="#e8ebe5" metalness={0.47} roughness={0.19} />
    </mesh>)}
    <mesh position={[0, 0, 0.478]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.085, 0.085, 0.035, 24]} />
      <meshStandardMaterial color="#f0f0eb" metalness={0.48} roughness={0.18} />
    </mesh>
    {[-1.34, 1.34].flatMap(x => [-1.34, 1.34].filter(y => !(x === 1.34 && y === -1.34)).map(y => <mesh key={`${x}-${y}`} position={[x, y, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.047, 0.047, 0.02, 24]} />
      <meshStandardMaterial color="#727573" metalness={0.8} roughness={0.24} />
    </mesh>))}
    <mesh position={[1.38, -1.38, 0.38]}>
      <sphereGeometry args={[0.055, 18, 18]} />
      <meshStandardMaterial color="#d39a42" emissive="#b87818" emissiveIntensity={0.3} roughness={0.3} />
    </mesh>
  </group>;
};

export const MetalLogo = ({ size = 670 }: { size?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settle = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 42 });
  return <div style={{ width: size, height: size, position: 'relative', filter: 'drop-shadow(22px 36px 26px #25262577)' }}>
    <ThreeCanvas width={size} height={size} camera={{ position: [0, 0, 7.5], fov: 38 }}>
      <ambientLight intensity={1.1} />
      <directionalLight position={[-4, 6, 7]} intensity={2.6} color="#fffef8" />
      <directionalLight position={[5, -3, 3]} intensity={1.0} color="#8b9a9c" />
      <pointLight position={[0, 1, 5]} intensity={0.8} color="#ffffff" />
      <BadgeObject settle={settle} />
    </ThreeCanvas>
  </div>;
};
