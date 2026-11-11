import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGlbBuffer } from '../apps/web/src/glb.ts';

function document(): any {
  return {
    asset: { version: '2.0' }, buffers: [{ byteLength: 36 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    nodes: [{ mesh: 0 }], scenes: [{ nodes: [0] }], scene: 0,
  };
}
function glb(doc: any, bin: Uint8Array = new Uint8Array(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer)) {
  const encoded = new TextEncoder().encode(JSON.stringify(doc));
  const jsonSize = Math.ceil(encoded.length / 4) * 4;
  const binSize = Math.ceil(bin.length / 4) * 4;
  const buffer = new ArrayBuffer(28 + jsonSize + binSize), view = new DataView(buffer);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, buffer.byteLength, true);
  view.setUint32(12, jsonSize, true); view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(buffer, 20, jsonSize).fill(32); new Uint8Array(buffer, 20, encoded.length).set(encoded);
  view.setUint32(20 + jsonSize, binSize, true); view.setUint32(24 + jsonSize, 0x004e4942, true);
  new Uint8Array(buffer, 28 + jsonSize, bin.length).set(bin);
  return buffer;
}

test('a real self-contained static GLB2 triangle is accepted before the loader', () => {
  assert.doesNotThrow(() => validateGlbBuffer(glb(document())));
});

test('GLB validation rejects corrupt headers and out-of-range data before parsing meshes', () => {
  const wrongMagic = glb(document()); new DataView(wrongMagic).setUint32(0, 0);
  const wrongVersion = glb(document()); new DataView(wrongVersion).setUint32(4, 1, true);
  const truncated = glb(document()).slice(0, 25);
  const outside = document(); outside.bufferViews[0].byteLength = 1000;
  for (const buffer of [wrongMagic, wrongVersion, truncated, glb(outside)]) assert.throws(() => validateGlbBuffer(buffer));
});

test('GLB validation rejects remote resources, extensions, bones, animation and cyclic scenes', () => {
  const cases = [
    (d: any) => { d.buffers[0].uri = 'https://example.com/private.bin'; },
    (d: any) => { d.materials = [{ extras: { uri: 'http://127.0.0.1/' } }]; },
    (d: any) => { d.extensionsUsed = ['KHR_draco_mesh_compression']; },
    (d: any) => { d.nodes[0].extensions = {}; },
    (d: any) => { d.animations = []; },
    (d: any) => { d.skins = []; },
    (d: any) => { d.meshes[0].primitives[0].attributes.JOINTS_0 = 0; },
    (d: any) => { d.accessors[0].sparse = {}; },
    (d: any) => { d.nodes[0].children = [0]; },
  ];
  for (const mutate of cases) {
    const d = document(); mutate(d);
    assert.throws(() => validateGlbBuffer(glb(d)));
  }
});

test('GLB validation checks actual geometry budgets and non-finite positions', () => {
  const d = document(), vertexCount = 80_001;
  const oversized = new Uint8Array(vertexCount * 12);
  d.buffers[0].byteLength = oversized.length; d.bufferViews[0].byteLength = oversized.length; d.accessors[0].count = vertexCount;
  assert.throws(() => validateGlbBuffer(glb(d, oversized)), /8万顶点/);
  const badPositions = new Float32Array([Number.NaN, 0, 0, 1, 0, 0, 0, 1, 0]);
  assert.throws(() => validateGlbBuffer(glb(document(), new Uint8Array(badPositions.buffer))), /坐标无效/);
});

test('embedded texture pixel bombs are rejected before any image decoding', () => {
  const d = document(); const bin = new Uint8Array(60); const png = new DataView(bin.buffer, 36, 24);
  png.setUint32(0, 0x89504e47); png.setUint32(4, 0x0d0a1a0a); png.setUint32(12, 0x49484452);
  png.setUint32(16, 20000); png.setUint32(20, 20000);
  d.buffers[0].byteLength = 60; d.bufferViews.push({ buffer: 0, byteOffset: 36, byteLength: 24 });
  d.images = [{ bufferView: 1, mimeType: 'image/png' }];
  assert.throws(() => validateGlbBuffer(glb(d, bin)), /贴图过大/);
});

test('scene roots cannot duplicate or reattach nodes to bypass the instance budget', () => {
  const duplicate = document(); duplicate.scenes[0].nodes = [0, 0];
  assert.throws(() => validateGlbBuffer(glb(duplicate)), /场景根节点/);
  const childRoot = document(); childRoot.nodes.push({ mesh: 0 });
  childRoot.nodes[0].children = [1]; childRoot.scenes[0].nodes = [0, 1];
  assert.throws(() => validateGlbBuffer(glb(childRoot)), /场景根节点/);
});
