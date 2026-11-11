import { LoadingManager } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { validateGlbBuffer } from './glb.ts';

/** Read only a preflighted, local GLB; no source URL or external asset is accepted. */
export async function loadLocalGlb(buffer: ArrayBuffer) {
  validateGlbBuffer(buffer);
  const manager = new LoadingManager();
  const objectUrls = new Set<string>();
  let textureFailures = 0;
  manager.onError = () => { textureFailures += 1; };
  manager.setURLModifier((url) => {
    if (!url.startsWith('blob:')) throw new Error('已阻止模型请求外部资源。');
    objectUrls.add(url);
    return url;
  });
  try {
    const gltf = await new GLTFLoader(manager).parseAsync(buffer, '');
    return { scene: gltf.scene, textureFailures };
  } finally {
    // GLTFLoader revokes successful image URLs, but swallows failed image loads
    // without revoking them. Releasing again is safe and covers both outcomes.
    for (const url of objectUrls) URL.revokeObjectURL(url);
    objectUrls.clear();
  }
}
