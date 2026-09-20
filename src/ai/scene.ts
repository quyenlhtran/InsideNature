export type SceneShape = 'box' | 'sphere' | 'cone' | 'half-cone' | 'cylinder' | 'torus' | 'plane';
export type SceneAnimation = 'none' | 'spin' | 'float' | 'pulse' | 'flow';
export type Vector3Tuple = [number, number, number];

export type SceneObjectSpec = {
  id: string;
  name: string;
  description: string;
  shape: SceneShape;
  position: Vector3Tuple;
  scale: Vector3Tuple;
  rotation: Vector3Tuple;
  color: string;
  opacity: number;
  animation: SceneAnimation;
};

export type SceneSpec = {
  title: string;
  summary: string;
  environment: {background: string; ground: string};
  camera: {position: Vector3Tuple; target: Vector3Tuple};
  objects: SceneObjectSpec[];
  labels: Array<{text: string; objectId: string; position: Vector3Tuple}>;
};

export type GeneratedScene = {
  source: 'nvidia' | 'fallback';
  model?: string;
  pipeline?: {
    planner: string;
    compiler: string;
    renderStrategy: 'cutaway' | 'landscape' | 'labeled-model';
  };
  scene: SceneSpec;
};

const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_SIDE = 1600;

export async function prepareImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Choose a PNG or JPEG image.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('Choose an image smaller than 12 MB.');

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const ratio = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image preparation is unavailable in this browser.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.88);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function generateScene(file: File): Promise<GeneratedScene> {
  const image = await prepareImage(file);
  const response = await fetch('/api/scene', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({image, filename: file.name}),
  });
  const body = await response.json().catch(() => ({})) as Partial<GeneratedScene> & {error?: string};
  if (!response.ok || !body.scene) throw new Error(body.error || 'We could not build a scene from that image.');
  return body as GeneratedScene;
}
