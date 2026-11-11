import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, Texture, type Group, type MeshStandardMaterial } from 'three';
import { loadLocalGlb } from '../apps/web/src/loadLocalGlb.ts';

/** Valid GLB geometry plus a size-checkable, deliberately truncated PNG. */
function texturedGlb() {
  const bin = new Uint8Array(84), view = new DataView(bin.buffer);
  new Float32Array(bin.buffer, 0, 9).set([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  new Float32Array(bin.buffer, 36, 6).set([0, 0, 1, 0, 0, 1]);
  view.setUint32(60, 0x89504e47); view.setUint32(64, 0x0d0a1a0a);
  view.setUint32(72, 0x49484452); view.setUint32(76, 1); view.setUint32(80, 1);
  const doc = {
    asset: { version: '2.0' }, buffers: [{ byteLength: 84 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }, { buffer: 0, byteOffset: 36, byteLength: 24 }, { buffer: 0, byteOffset: 60, byteLength: 24 }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] },
      { bufferView: 1, componentType: 5126, count: 3, type: 'VEC2' },
    ],
    images: [{ bufferView: 2, mimeType: 'image/png' }], textures: [{ source: 0 }],
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, material: 0 }] }],
    nodes: [{ mesh: 0 }], scenes: [{ nodes: [0] }], scene: 0,
  };
  const encoded = new TextEncoder().encode(JSON.stringify(doc));
  const size = Math.ceil(encoded.length / 4) * 4;
  const buffer = new ArrayBuffer(28 + size + bin.length), output = new DataView(buffer);
  output.setUint32(0, 0x46546c67, true); output.setUint32(4, 2, true); output.setUint32(8, buffer.byteLength, true);
  output.setUint32(12, size, true); output.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(buffer, 20, size).fill(32); new Uint8Array(buffer, 20, encoded.length).set(encoded);
  output.setUint32(20 + size, bin.length, true); output.setUint32(24 + size, 0x004e4942, true);
  new Uint8Array(buffer, 28 + size).set(bin);
  return buffer;
}

function disposeScene(scene: Group | undefined) {
  scene?.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      for (const value of Object.values(material)) if (value instanceof Texture) value.dispose();
      material.dispose();
    }
  });
}

test('real GLTFLoader releases embedded blob URLs when image decoding fails but the loader returns an untextured scene', async () => {
  const selfDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'self');
  const bitmapDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap');
  const createUrl = URL.createObjectURL, revokeUrl = URL.revokeObjectURL;
  const created = new Set<string>(), revoked = new Set<string>();
  let decodes = 0, scene: Group | undefined;
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, value: async (blob: Blob) => {
    decodes += 1;
    assert.equal(blob.size, 24, 'the real loader fetched the actual embedded PNG blob');
    throw new Error('intentional image decode failure at the browser decoder boundary');
  } });
  URL.createObjectURL = (blob) => { const url = createUrl(blob); created.add(url); return url; };
  URL.revokeObjectURL = (url) => { revoked.add(url); revokeUrl(url); };
  try {
    const result = await loadLocalGlb(texturedGlb()); scene = result.scene;
    assert.equal(decodes, 1);
    assert.equal(created.size, 1);
    assert.equal(result.textureFailures, 1, 'a swallowed decoder error must be visible to the importing UI');
    const mesh = scene.children[0] as Mesh;
    assert.equal(mesh.geometry.getAttribute('position').count, 3);
    assert.equal((mesh.material as MeshStandardMaterial).map, null);
    assert([...created].every((url) => revoked.has(url)), 'failed texture decoding must not retain its embedded object URL');
  } finally {
    disposeScene(scene);
    for (const url of created) revokeUrl(url);
    URL.createObjectURL = createUrl; URL.revokeObjectURL = revokeUrl;
    if (selfDescriptor) Object.defineProperty(globalThis, 'self', selfDescriptor); else Reflect.deleteProperty(globalThis, 'self');
    if (bitmapDescriptor) Object.defineProperty(globalThis, 'createImageBitmap', bitmapDescriptor); else Reflect.deleteProperty(globalThis, 'createImageBitmap');
  }
});
