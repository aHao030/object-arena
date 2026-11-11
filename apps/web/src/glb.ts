export const MAX_GLB_BYTES = 20 * 1024 * 1024;
const MAX_VERTICES = 80_000;
const MAX_TRIANGLES = 50_000;
const MAX_IMAGE_PIXELS = 8_388_608;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
type Json = Record<string, any>;

function rejectImport(message: string): never { throw new Error(message); }
function integer(v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number {
  return Number.isSafeInteger(v) && (v as number) >= min && (v as number) <= max;
}
function list(v: unknown, max: number, label: string): Json[] {
  if (!Array.isArray(v) || v.length > max || v.some((x) => !x || typeof x !== 'object' || Array.isArray(x))) {
    rejectImport(`${label}结构或数量超出本地预览限制。`);
  }
  return v;
}

function imagePixels(bytes: Uint8Array, mime: string): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let w = 0, h = 0;
  if (mime === 'image/png') {
    if (bytes.length < 24 || view.getUint32(0) !== 0x89504e47 || view.getUint32(4) !== 0x0d0a1a0a
        || view.getUint32(12) !== 0x49484452) rejectImport('内嵌PNG格式无效。');
    w = view.getUint32(16); h = view.getUint32(20);
  } else if (mime === 'image/jpeg') {
    if (bytes.length < 4 || view.getUint16(0) !== 0xffd8) rejectImport('内嵌JPEG格式无效。');
    let at = 2;
    while (at + 4 <= bytes.length && at < 65_536) {
      if (bytes[at++] !== 0xff) rejectImport('内嵌JPEG头部无效。');
      while (bytes[at] === 0xff) at++;
      const marker = bytes[at++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (at + 2 > bytes.length) break;
      const length = view.getUint16(at);
      if (length < 2 || at + length > bytes.length) rejectImport('内嵌JPEG长度无效。');
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        if (length < 8) rejectImport('内嵌JPEG尺寸无效。');
        h = view.getUint16(at + 3); w = view.getUint16(at + 5); break;
      }
      at += length;
    }
  } else rejectImport('本地外壳仅支持内嵌PNG/JPEG贴图。');
  if (!w || !h || w > 4096 || h > 4096 || w * h > 4_194_304) {
    rejectImport('内嵌贴图过大或无法验证尺寸；请缩至每张不超过4096边长、400万像素。');
  }
  return w * h;
}

/** Preflight the complete static, self-contained GLB before GLTFLoader can allocate or fetch. */
export function validateGlbBuffer(buffer: ArrayBuffer): void {
  if (buffer.byteLength < 28 || buffer.byteLength > MAX_GLB_BYTES) rejectImport('请选择不超过20MB的静态GLB 2文件。');
  const data = new DataView(buffer);
  if (data.getUint32(0, true) !== 0x46546c67 || data.getUint32(4, true) !== 2
      || data.getUint32(8, true) !== buffer.byteLength) rejectImport('文件不是完整有效的GLB 2。');
  const jsonLength = data.getUint32(12, true);
  if (data.getUint32(16, true) !== 0x4e4f534a || jsonLength > 1_048_576 || jsonLength % 4 !== 0) {
    rejectImport('GLB必须以不超过1MB的JSON块开始。');
  }
  const binHeader = 20 + jsonLength;
  if (binHeader + 8 > buffer.byteLength || data.getUint32(binHeader + 4, true) !== 0x004e4942) {
    rejectImport('GLB必须且只能包含一个JSON块和一个内嵌BIN块。');
  }
  const binLength = data.getUint32(binHeader, true);
  const binStart = binHeader + 8;
  if (binLength % 4 !== 0 || binStart + binLength !== buffer.byteLength) rejectImport('内嵌数据长度不一致或包含额外块。');
  let doc: Json;
  try { doc = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(buffer, 20, jsonLength))); }
  catch { rejectImport('GLB的JSON无法解析。'); }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc) || doc.asset?.version !== '2.0') rejectImport('GLB版本信息无效。');
  const queue: unknown[] = [doc];
  let visited = 0;
  while (queue.length) {
    const value = queue.pop();
    if (!value || typeof value !== 'object') continue;
    if (++visited > 20_000) rejectImport('模型描述过于复杂。');
    for (const [key, entry] of Object.entries(value)) {
      if (['uri', 'extensions', 'extensionsUsed', 'extensionsRequired', 'skin', 'skins', 'animations'].includes(key)) {
        rejectImport('仅接受无URI、外链、扩展、动画和骨骼的静态GLB；请先在建模工具中烘焙。');
      }
      if (entry && typeof entry === 'object') queue.push(entry);
    }
  }
  const buffers = list(doc.buffers, 1, '缓冲区');
  if (buffers.length !== 1 || !integer(buffers[0].byteLength, 1, binLength) || binLength - buffers[0].byteLength > 3) {
    rejectImport('只支持一个唯一内嵌缓冲区。');
  }
  const views = list(doc.bufferViews, 256, '数据视图');
  for (const v of views) {
    if (v.buffer !== 0 || !integer(v.byteOffset ?? 0) || !integer(v.byteLength, 1)
        || (v.byteOffset ?? 0) + v.byteLength > buffers[0].byteLength
        || (v.byteStride !== undefined && (!integer(v.byteStride, 4, 252) || v.byteStride % 4 !== 0))) {
      rejectImport('缓冲区范围或步长无效。');
    }
  }
  const accessors = list(doc.accessors, 512, '顶点访问器');
  const bytes: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
  const sizes: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  for (const a of accessors) {
    if (!integer(a.bufferView, 0, views.length - 1) || !integer(a.count, 1, MAX_VERTICES * 3)
        || !bytes[a.componentType] || !sizes[a.type] || a.sparse !== undefined || !integer(a.byteOffset ?? 0)) {
      rejectImport('访问器不受支持；请导出普通非稀疏的静态网格。');
    }
    const v = views[a.bufferView], element = bytes[a.componentType] * sizes[a.type];
    const stride = v.byteStride ?? element;
    if (stride < element || (a.byteOffset ?? 0) + (a.count - 1) * stride + element > v.byteLength) {
      rejectImport('访问器越过内嵌数据边界。');
    }
  }
  const meshes = list(doc.meshes, 64, '网格');
  let primitives = 0;
  const budgets = meshes.map((mesh) => {
    let vertices = 0, triangles = 0;
    for (const p of list(mesh.primitives, 64, '网格面组')) {
      if (++primitives > 128 || (p.mode !== undefined && p.mode !== 4) || p.targets !== undefined
          || !p.attributes || typeof p.attributes !== 'object') rejectImport('只支持有限数量的静态三角网格。');
      if (Object.keys(p.attributes).some((key) => !['POSITION', 'NORMAL', 'TANGENT', 'TEXCOORD_0', 'TEXCOORD_1', 'COLOR_0'].includes(key))) {
        rejectImport('网格包含不受支持的骨骼或顶点属性。');
      }
      for (const value of Object.values(p.attributes)) {
        if (!integer(value, 0, accessors.length - 1)) rejectImport('网格属性引用无效。');
      }
      const position = accessors[p.attributes.POSITION];
      if (!position || position.type !== 'VEC3' || position.componentType !== 5126 || position.normalized) rejectImport('位置数据必须是普通Float32三维坐标。');
      const pv = views[position.bufferView], stride = pv.byteStride ?? 12;
      for (let i = 0; i < position.count; i++) for (let axis = 0; axis < 3; axis++) {
        const v = data.getFloat32(binStart + (pv.byteOffset ?? 0) + (position.byteOffset ?? 0) + i * stride + axis * 4, true);
        if (!Number.isFinite(v) || Math.abs(v) > 100_000) rejectImport('模型坐标无效或远超适配尺度。');
      }
      const indices = p.indices === undefined ? null : accessors[p.indices];
      if (p.indices !== undefined && (!integer(p.indices, 0, accessors.length - 1) || !indices
          || indices.type !== 'SCALAR' || ![5121, 5123, 5125].includes(indices.componentType))) rejectImport('三角索引无效。');
      const count = indices?.count ?? position.count;
      if (count % 3 !== 0) rejectImport('三角索引数量必须为3的倍数。');
      if (indices) {
        const v = views[indices.bufferView], component = bytes[indices.componentType], stride = v.byteStride ?? component;
        for (let i = 0; i < indices.count; i++) {
          const at = binStart + (v.byteOffset ?? 0) + (indices.byteOffset ?? 0) + i * stride;
          const index = component === 1 ? data.getUint8(at) : component === 2 ? data.getUint16(at, true) : data.getUint32(at, true);
          if (index >= position.count) rejectImport('三角索引超出顶点范围。');
        }
      }
      vertices += position.count; triangles += count / 3;
    }
    return { vertices, triangles };
  });
  const nodes = list(doc.nodes, 128, '节点');
  let totalVertices = 0, totalTriangles = 0;
  const parents = new Set<number>();
  for (const node of nodes) {
    if (node.mesh !== undefined) {
      if (!integer(node.mesh, 0, meshes.length - 1)) rejectImport('节点网格引用无效。');
      totalVertices += budgets[node.mesh].vertices; totalTriangles += budgets[node.mesh].triangles;
    }
    for (const [key, length] of [['translation', 3], ['rotation', 4], ['scale', 3], ['matrix', 16]] as const) {
      const v = node[key];
      if (v !== undefined && (!Array.isArray(v) || v.length !== length || v.some((n: unknown) => !finite(n) || Math.abs(n) > 10_000))) {
        rejectImport('节点变换无效。');
      }
    }
    if (node.scale?.some((n: number) => n <= 0)) rejectImport('请先烘焙零缩放或负缩放变换。');
    if (node.children !== undefined && (!Array.isArray(node.children) || node.children.some((child: unknown) => !integer(child, 0, nodes.length - 1)))) rejectImport('节点层级无效。');
    for (const child of node.children ?? []) {
      if (parents.has(child)) rejectImport('节点不能重复挂接。');
      parents.add(child);
    }
  }
  if (!totalTriangles || totalVertices > MAX_VERTICES || totalTriangles > MAX_TRIANGLES) rejectImport('外壳最多8万顶点、5万三角面；请先简化模型。');
  const visit = (index: number, path: Set<number>) => {
    if (path.has(index) || path.size > 32) rejectImport('节点存在循环或过深层级。');
    const next = new Set(path); next.add(index);
    for (const child of nodes[index].children ?? []) visit(child, next);
  };
  for (let i = 0; i < nodes.length; i++) visit(i, new Set());
  const scenes = list(doc.scenes, 1, '场景');
  if (scenes.length !== 1 || (doc.scene !== undefined && doc.scene !== 0)
      || !Array.isArray(scenes[0].nodes) || scenes[0].nodes.some((n: unknown) => !integer(n, 0, nodes.length - 1))) rejectImport('仅支持一个有效的静态场景。');
  if (scenes[0].nodes.length > nodes.length || new Set(scenes[0].nodes).size !== scenes[0].nodes.length
      || scenes[0].nodes.some((n: number) => parents.has(n))) {
    rejectImport('场景根节点不能重复，也不能再次引用已有父节点的子节点。');
  }
  list(doc.materials ?? [], 32, '材质');
  list(doc.textures ?? [], 8, '贴图');
  let pixels = 0;
  for (const image of list(doc.images ?? [], 8, '内嵌图片')) {
    if (!integer(image.bufferView, 0, views.length - 1)) rejectImport('贴图必须来自内嵌缓冲区。');
    const v = views[image.bufferView];
    pixels += imagePixels(new Uint8Array(buffer, binStart + (v.byteOffset ?? 0), v.byteLength), image.mimeType);
  }
  if (pixels > MAX_IMAGE_PIXELS) rejectImport('内嵌贴图总像素超过800万；请降低贴图分辨率。');
}
