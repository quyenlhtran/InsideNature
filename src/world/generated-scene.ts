import * as T from 'three';
import type {SceneObjectSpec, SceneSpec} from '../ai/scene.ts';

export type GeneratedSceneHandle = {
  root: T.Group;
  interactiveObjects: T.Object3D[];
  hasLayers: boolean;
  setLayersSeparated: (separated: boolean) => void;
  update: (time: number) => void;
  dispose: () => void;
};

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index++) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return result >>> 0;
}

function stratumGeometry(id: string) {
  const segments = 18;
  const positions: number[] = [];
  const random = (index: number) => {
    const value = Math.sin((hash(id) + index * 92821) * 0.000013) * 43758.5453;
    return value - Math.floor(value);
  };
  const top = Array.from({length: segments + 1}, (_, index) => 0.44 + (random(index) - 0.5) * 0.16);
  const bottom = Array.from({length: segments + 1}, (_, index) => -0.48 + (random(index + 71) - 0.5) * 0.08);
  const pushTriangle = (a: number[], b: number[], c: number[]) => positions.push(...a, ...b, ...c);
  for (let index = 0; index < segments; index++) {
    const x0 = index / segments - 0.5, x1 = (index + 1) / segments - 0.5;
    for (const z of [-0.5, 0.5]) {
      const direction = z < 0 ? 1 : -1;
      const a = [x0, bottom[index], z], b = [x1, bottom[index + 1], z];
      const c = [x1, top[index + 1], z], d = [x0, top[index], z];
      if (direction > 0) { pushTriangle(a, b, c); pushTriangle(a, c, d); }
      else { pushTriangle(a, c, b); pushTriangle(a, d, c); }
    }
    const topA = [x0, top[index], -0.5], topB = [x1, top[index + 1], -0.5];
    const topC = [x1, top[index + 1], 0.5], topD = [x0, top[index], 0.5];
    pushTriangle(topA, topC, topB); pushTriangle(topA, topD, topC);
    const bottomA = [x0, bottom[index], -0.5], bottomB = [x1, bottom[index + 1], -0.5];
    const bottomC = [x1, bottom[index + 1], 0.5], bottomD = [x0, bottom[index], 0.5];
    pushTriangle(bottomA, bottomB, bottomC); pushTriangle(bottomA, bottomC, bottomD);
  }
  for (const [index, x] of [[0, -0.5], [segments, 0.5]] as const) {
    const a = [x, bottom[index], -0.5], b = [x, bottom[index], 0.5];
    const c = [x, top[index], 0.5], d = [x, top[index], -0.5];
    if (x < 0) { pushTriangle(a, c, b); pushTriangle(a, d, c); }
    else { pushTriangle(a, b, c); pushTriangle(a, c, d); }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function geometryFor(shape: SceneObjectSpec['shape'], id: string) {
  switch (shape) {
    case 'sphere': return new T.SphereGeometry(0.5, 28, 20);
    case 'cone': return new T.ConeGeometry(0.5, 1, 32);
    case 'half-cone': return new T.ConeGeometry(0.5, 1, 32, 1, false, 0, Math.PI);
    case 'cylinder': return new T.CylinderGeometry(0.5, 0.5, 1, 28);
    case 'torus': return new T.TorusGeometry(0.5, 0.16, 16, 40);
    case 'plane': return new T.BoxGeometry(1, 0.08, 1);
    case 'stratum': return stratumGeometry(id);
    case 'root': return new T.ConeGeometry(0.5, 1, 9);
    case 'rock': return new T.DodecahedronGeometry(0.5, 0);
    default: return new T.BoxGeometry(1, 1, 1);
  }
}

function labelSprite(text: string) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  context.font = '600 30px Manrope, sans-serif';
  const width = Math.min(620, Math.max(190, Math.ceil(context.measureText(text).width + 54)));
  canvas.width = width;
  canvas.height = 74;
  context.fillStyle = 'rgba(8, 35, 29, .92)';
  context.roundRect(2, 2, width - 4, 70, 18);
  context.fill();
  context.strokeStyle = 'rgba(220, 244, 218, .5)';
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = '#f7f2df';
  context.font = '600 30px Manrope, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, width / 2, 37, width - 36);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const material = new T.SpriteMaterial({map: texture, transparent: true, depthTest: false});
  const sprite = new T.Sprite(material);
  sprite.scale.set(width / 105, 0.7, 1);
  sprite.renderOrder = 20;
  return sprite;
}

export function renderGeneratedScene(scene: T.Scene, spec: SceneSpec): GeneratedSceneHandle {
  const root = new T.Group();
  root.name = `Generated scene: ${spec.title}`;
  const interactiveObjects: T.Object3D[] = [];
  const animated: T.Mesh[] = [];
  const layers: T.Mesh[] = [];
  const layerLabels: Array<{sprite: T.Sprite; target: T.Mesh; baseY: number}> = [];
  const byId = new Map<string, T.Mesh>();

  const groundMaterial = new T.MeshStandardMaterial({color: spec.environment.ground, roughness: 0.92});
  const ground = new T.Mesh(new T.CylinderGeometry(21, 21, 0.45, 64), groundMaterial);
  const lowestPoint = Math.min(...spec.objects.map(object => object.position[1] - object.scale[1] / 2), -0.35);
  ground.position.y = spec.presentation === 'cutaway' ? lowestPoint - 0.5 : -0.35;
  ground.receiveShadow = true;
  root.add(ground);

  for (const object of spec.objects) {
    const material = new T.MeshStandardMaterial({
      color: object.color,
      roughness: object.animation === 'flow' ? 0.35 : 0.72,
      metalness: 0,
      transparent: object.opacity < 1,
      opacity: object.opacity,
      side: object.shape === 'half-cone' ? T.DoubleSide : T.FrontSide,
      emissive: object.animation === 'flow' || object.animation === 'pulse' ? new T.Color(object.color).multiplyScalar(0.18) : new T.Color(0x000000),
    });
    const mesh = new T.Mesh(geometryFor(object.shape, object.id), material);
    mesh.name = object.name;
    mesh.position.fromArray(object.position);
    mesh.scale.fromArray(object.scale);
    mesh.rotation.fromArray(object.rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.sceneObject = object;
    mesh.userData.basePosition = mesh.position.clone();
    mesh.userData.baseScale = mesh.scale.clone();
    root.add(mesh);
    byId.set(object.id, mesh);
    interactiveObjects.push(mesh);
    if (object.shape === 'stratum') layers.push(mesh);
    if (object.animation !== 'none') animated.push(mesh);
  }

  for (const label of spec.labels) {
    const target = byId.get(label.objectId);
    if (!target) continue;
    const sprite = labelSprite(label.text);
    const provided = new T.Vector3().fromArray(label.position);
    sprite.position.copy(provided.lengthSq() > 0 ? provided : target.position.clone().add(new T.Vector3(0, target.scale.y * 0.7 + 0.7, 0)));
    if ((target.userData.sceneObject as SceneObjectSpec).shape === 'stratum') layerLabels.push({sprite, target, baseY: sprite.position.y});
    sprite.userData.sceneObject = target.userData.sceneObject;
    root.add(sprite);
    interactiveObjects.push(sprite);
  }

  scene.add(root);
  layers.sort((a, b) => b.position.y - a.position.y);
  layers.forEach((layer, index) => { layer.userData.layerOffset = -index * 0.48; });
  let separationTarget = 0, separation = 0;
  const update = (time: number) => {
    separation = T.MathUtils.lerp(separation, separationTarget, 0.09);
    for (const layer of layers) layer.position.y = layer.userData.basePosition.y + layer.userData.layerOffset * separation;
    for (const label of layerLabels) label.sprite.position.y = label.baseY + label.target.position.y - label.target.userData.basePosition.y;
    for (const mesh of animated) {
      const object = mesh.userData.sceneObject as SceneObjectSpec;
      const phase = mesh.id * 0.17;
      if (object.animation === 'spin') mesh.rotation.y += 0.006;
      if (object.animation === 'float') mesh.position.y = mesh.userData.basePosition.y + Math.sin(time * 1.4 + phase) * 0.22;
      if (object.animation === 'pulse') {
        const amount = 1 + Math.sin(time * 2.2 + phase) * 0.055;
        mesh.scale.copy(mesh.userData.baseScale).multiplyScalar(amount);
      }
      if (object.animation === 'flow') {
        const material = mesh.material as T.MeshStandardMaterial;
        material.emissiveIntensity = 0.65 + Math.sin(time * 4 + phase) * 0.25;
      }
    }
  };
  const setLayersSeparated = (separated: boolean) => { separationTarget = separated ? 1 : 0; };
  const dispose = () => {
    scene.remove(root);
    root.traverse(child => {
      if (child instanceof T.Mesh) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(material => material.dispose());
      }
      if (child instanceof T.Sprite) {
        child.material.map?.dispose();
        child.material.dispose();
      }
    });
  };
  return {root, interactiveObjects, hasLayers: layers.length > 1, setLayersSeparated, update, dispose};
}
