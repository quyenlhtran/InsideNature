import * as T from 'three';
import type {SceneObjectSpec, SceneSpec} from '../ai/scene.ts';

export type GeneratedSceneHandle = {
  root: T.Group;
  interactiveObjects: T.Object3D[];
  update: (time: number) => void;
  dispose: () => void;
};

function geometryFor(shape: SceneObjectSpec['shape']) {
  switch (shape) {
    case 'sphere': return new T.SphereGeometry(0.5, 28, 20);
    case 'cone': return new T.ConeGeometry(0.5, 1, 32);
    case 'half-cone': return new T.ConeGeometry(0.5, 1, 32, 1, false, 0, Math.PI);
    case 'cylinder': return new T.CylinderGeometry(0.5, 0.5, 1, 28);
    case 'torus': return new T.TorusGeometry(0.5, 0.16, 16, 40);
    case 'plane': return new T.BoxGeometry(1, 0.08, 1);
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
  const byId = new Map<string, T.Mesh>();

  const groundMaterial = new T.MeshStandardMaterial({color: spec.environment.ground, roughness: 0.92});
  const ground = new T.Mesh(new T.CylinderGeometry(21, 21, 0.45, 64), groundMaterial);
  ground.position.y = -0.35;
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
    const mesh = new T.Mesh(geometryFor(object.shape), material);
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
    if (object.animation !== 'none') animated.push(mesh);
  }

  for (const label of spec.labels) {
    const target = byId.get(label.objectId);
    if (!target) continue;
    const sprite = labelSprite(label.text);
    const provided = new T.Vector3().fromArray(label.position);
    sprite.position.copy(provided.lengthSq() > 0 ? provided : target.position.clone().add(new T.Vector3(0, target.scale.y * 0.7 + 0.7, 0)));
    sprite.userData.sceneObject = target.userData.sceneObject;
    root.add(sprite);
    interactiveObjects.push(sprite);
  }

  scene.add(root);
  const update = (time: number) => {
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
  return {root, interactiveObjects, update, dispose};
}
