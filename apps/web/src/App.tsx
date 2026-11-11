import {useEffect, useRef, useState, type PointerEvent} from 'react';
import {Client, type Room} from '@colyseus/sdk';
import {AppShell} from '@astryxdesign/core/AppShell';
import {TopNav, TopNavHeading} from '@astryxdesign/core/TopNav';
import {Button} from '@astryxdesign/core/Button';
import {Section} from '@astryxdesign/core/Section';
import {VStack, HStack, Stack, StackItem} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {Slider} from '@astryxdesign/core/Slider';
import {TextInput} from '@astryxdesign/core/TextInput';
import {FileInput} from '@astryxdesign/core/FileInput';
import {CubeTransparentIcon, PlayIcon, ArrowUpTrayIcon} from '@heroicons/react/24/outline';
import {Icon} from '@astryxdesign/core/Icon';
import {Scene, type SceneHandle} from './Scene';
import {CATALOG, type Snapshot} from '../../../packages/protocol/src/index';
import {CONTROL_LABELS, makeInputFrame, type ControlAction} from './input';
import {applyMouseLook} from './mouseLook';
import type {MechanicalCheckReport} from '../../lab/src/index.js';

const endpoint = import.meta.env.DEV ? `${location.protocol}//${location.hostname}:2567` : location.origin;

function useWide() {
  const [wide, setWide] = useState(window.innerWidth >= 1050);
  useEffect(() => {
    const media = matchMedia('(min-width: 1050px)');
    const update = () => setWide(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return wide;
}

function HoldButton({label, action, held}: {label: string; action: ControlAction; held: React.RefObject<Set<ControlAction>>}) {
  const down = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    held.current.add(action); event.preventDefault();
  };
  const up = () => {held.current.delete(action);};
  return <Button label={label} variant="secondary" onPointerDown={down}
    onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up}
    onKeyDown={event => {if (event.key === ' ' || event.key === 'Enter') held.current.add(action);}}
    onKeyUp={up} onBlur={up} />;
}

export default function App() {
  const wide = useWide();
  const roomRef = useRef<Room | null>(null);
  const scene = useRef<SceneHandle>(null);
  const held = useRef(new Set<ControlAction>());
  const aim = useRef({yaw: 0, pitch: 0});
  const mouseCaptured = useRef(false);
  const sequence = useRef(0);
  const seeded = useRef(false);
  const connectionAttempt = useRef(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [connectedRoom, setConnectedRoom] = useState('');
  const [roomId, setRoomId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [notice, setNotice] = useState('机库就绪。先进入训练场，试一试你的第一台机体。');
  const [renderer, setRenderer] = useState('正在准备 3D 场景…');
  const [mouseLook, setMouseLook] = useState({locked: false, message: '单击战场启用鼠标视角，或按住右键拖动。'});
  const [importStatus, setImportStatus] = useState('原创标准机体 · 可本地替换躯干外观');
  const [file, setFile] = useState<File | null>(null);
  const [payloadKg, setPayloadKg] = useState(0.1);
  const [lab, setLab] = useState<MechanicalCheckReport | null>(null);
  const [labBusy, setLabBusy] = useState(false);
  const [labError, setLabError] = useState('');
  const [yawDegrees, setYawDegrees] = useState(0);
  const [pitchDegrees, setPitchDegrees] = useState(0);
  const own = snapshot?.players.find(player => player.id === playerId);

  useEffect(() => {
    const keyActions: Record<string, ControlAction> = {
      KeyW:'forward', ArrowUp:'forward', KeyS:'back', ArrowDown:'back',
      KeyA:'left', KeyD:'right', ArrowLeft:'turnLeft', ArrowRight:'turnRight',
      Space:'fire', ShiftLeft:'boost', ShiftRight:'boost', KeyE:'lift',
    };
    const keyDown = (event: KeyboardEvent) => {
      if (!roomRef.current || !keyActions[event.code]) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input,textarea,select,button,[role="slider"]')) return;
      event.preventDefault(); held.current.add(keyActions[event.code]);
    };
    const keyUp = (event: KeyboardEvent) => {if (keyActions[event.code]) held.current.delete(keyActions[event.code]);};
    const clear = () => held.current.clear();
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear);
    const timer = window.setInterval(() => {
      const keys = held.current;
      const turn = Number(keys.has('turnLeft')) - Number(keys.has('turnRight'));
      if (turn) {
        const yaw = aim.current.yaw + turn * 0.045;
        aim.current.yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      }
      setYawDegrees(Math.round(aim.current.yaw * 180 / Math.PI));
      setPitchDegrees(Math.round(aim.current.pitch * 180 / Math.PI));
      scene.current?.setView(aim.current.yaw, aim.current.pitch);
      const room = roomRef.current;
      if (!room) return;
      room.send('input', makeInputFrame(sequence.current++, keys, aim.current));
    }, 1000 / 30);
    return () => {
      clearInterval(timer); window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', clear);
      connectionAttempt.current++; void roomRef.current?.leave(); roomRef.current = null;
    };
  }, []);

  async function connect(mode: 'training' | 'arena' | 'friend') {
    if (connecting) return;
    const attempt = ++connectionAttempt.current;
    setConnecting(true); setNotice('正在连接竞技服务器…'); held.current.clear(); scene.current?.releaseMouse();
    const previous = roomRef.current; roomRef.current = null;
    setPlayerId(null); setSnapshot(null); setConnectedRoom('');
    try {
      await previous?.leave();
      const client = new Client(endpoint);
      const room = mode === 'friend' ? await client.joinById(roomId.trim()) : await client.joinOrCreate(mode);
      if (attempt !== connectionAttempt.current) {await room.leave(); return;}
      roomRef.current = room; sequence.current = 0; seeded.current = false;
      setPlayerId(room.sessionId); setConnectedRoom(room.roomId);
      room.onMessage('snapshot', (next: Snapshot) => {
        if (roomRef.current !== room) return;
        if (!seeded.current) {
          const player = next.players.find(value => value.id === room.sessionId);
          if (player) {
            aim.current = {yaw: player.rotationYaw, pitch: 0};
            setYawDegrees(Math.round(player.rotationYaw * 180 / Math.PI));
            setPitchDegrees(0); seeded.current = true;
          }
        }
        setSnapshot(next);
      });
      room.onMessage('result', () => {held.current.clear(); scene.current?.releaseMouse();});
      room.onMessage('input-rejected', () => {});
      room.onError((_code, message) => setNotice(`连接出现错误：${message || '请重新进入房间'}`));
      room.onLeave(() => {
        if (roomRef.current !== room) return;
        held.current.clear(); roomRef.current = null;
        scene.current?.releaseMouse();
        setPlayerId(null); setConnectedRoom(''); setNotice('已离开房间，可重新进入。');
      });
      setNotice(mode === 'training' ? '训练开始：前方橙色靶标由服务器判定命中。' : '双人房间已连接。分享房间号，等待另一位驾驶员。');
      (document.activeElement as HTMLElement | null)?.blur();
    } catch (error) {setNotice(`连接失败：${error instanceof Error ? error.message : '请确认竞技服务器已启动'}`);}
    finally {if (attempt === connectionAttempt.current) setConnecting(false);}
  }

  async function leave() {
    ++connectionAttempt.current; held.current.clear(); scene.current?.releaseMouse();
    const room = roomRef.current; roomRef.current = null;
    setPlayerId(null); setSnapshot(null); setConnectedRoom(''); setNotice('已返回机库。');
    await room?.leave();
  }

  async function checkLab() {
    setLabBusy(true); setLabError(''); setLab(null);
    try {
      const response = await fetch(`${endpoint}/api/lab/check`, {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({payloadKg}),
        signal: AbortSignal.timeout(12000),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || body.error || '机械验证暂不可用');
      setLab(body);
    } catch (error) {setLabError(error instanceof Error ? error.message : '验证失败，请重试');}
    finally {setLabBusy(false);}
  }

  async function copyRoom() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable');
      await navigator.clipboard.writeText(connectedRoom);
      setNotice('房间号已复制。');
    } catch {setNotice(`请手动复制房间号：${connectedRoom}`);}
  }

  function changeMouseLook(deltaX: number, deltaY: number) {
    aim.current = applyMouseLook(aim.current, deltaX, deltaY);
    scene.current?.setView(aim.current.yaw, aim.current.pitch);
  }

  function mouseLookChanged(locked: boolean, message: string) {
    if (mouseCaptured.current && !locked) held.current.clear();
    mouseCaptured.current = locked;
    setMouseLook({locked, message});
  }

  const changeYaw = (value: number | [number, number]) => {
    const degrees = Number(value); setYawDegrees(degrees); aim.current.yaw = degrees * Math.PI / 180;
  };
  const changePitch = (value: number | [number, number]) => {
    const degrees = Number(value); setPitchDegrees(degrees); aim.current.pitch = degrees * Math.PI / 180;
  };
  const status = snapshot?.status === 'finished' ? '本场已结束' : snapshot?.status === 'waiting' ? '等待第二位驾驶员' : own ? '正在驾驶' : '机库预览';

  return <AppShell variant="surface" height="auto" contentPadding={6}
    topNav={<TopNav label="平台导航" heading={<TopNavHeading heading="OBJECT ARENA" subheading="模型机体竞技实验室" logo={<Icon icon={CubeTransparentIcon} />} />}
      endContent={<Text type="supporting">v0.5 · 可玩原型</Text>} />}>
    <VStack gap={6} maxWidth={1440} width="100%">
      <HStack gap={4} wrap="wrap" vAlign="center" hAlign="between">
        <VStack gap={2}>
          <Text type="label" color="secondary">BUILD YOUR MACHINE. PILOT YOUR RULES.</Text>
          <Heading level={1}>从你的模型，到你的战场。</Heading>
          <Text color="secondary">驾驶原创机体，验证改装，再用同一套物理规则对战。</Text>
        </VStack>
        <HStack gap={2} wrap="wrap">
          <Button label="进入训练场" variant="primary" icon={<Icon icon={PlayIcon} />} onClick={() => void connect('training')} isLoading={connecting} />
          <Button label="双人对战" variant="secondary" onClick={() => void connect('arena')} isDisabled={connecting} />
          {connectedRoom && <Button label="返回机库" variant="ghost" onClick={() => void leave()} />}
        </HStack>
      </HStack>
      <Stack direction={wide ? 'horizontal' : 'vertical'} gap={6} width="100%" vAlign="start">
        <StackItem size="fill">
          <VStack gap={4} width="100%">
            <Section padding={0} variant="muted">
              <Scene ref={scene} snapshot={snapshot} playerId={playerId} importedFile={file}
                onImportStatus={setImportStatus} onRendererStatus={setRenderer}
                onLook={changeMouseLook} onMouseLookChange={mouseLookChanged} />
            </Section>
            <HStack gap={3} wrap="wrap" vAlign="center">
              <Button label={mouseLook.locked ? '退出鼠标视角' : '启用鼠标视角'} variant="secondary" size="sm"
                onClick={() => mouseLook.locked ? scene.current?.releaseMouse() : scene.current?.captureMouse()} />
              <Text id="mouse-look-help" type="supporting" role="status">{mouseLook.message}</Text>
            </HStack>
            <HStack gap={4} hAlign="between" wrap="wrap">
              <VStack gap={1}>
                <Text type="label">{status} · {own ? '试作机 OA-01' : 'OA-01 / FRAME ONE'}</Text>
                <Text type="supporting" color="secondary">{renderer}</Text>
              </VStack>
              <Text type="code">{own ? `核心 ${Math.round(own.health)} / 1000 · 能量 ${(own.energy / 1000).toFixed(1)} kJ · 热量 ${Math.round(own.heat)}%` : '2.2 m · 180 kg · 50 kJ'}</Text>
            </HStack>
            <Section variant="section" padding={4}>
              <VStack gap={3}>
                <Text role="status" aria-live="polite">{notice}</Text>
                {snapshot && <Text type="supporting" color="secondary">服务器步数 {snapshot.serverTick} · 剩余 {Math.ceil(snapshot.remaining)} 秒 · 靶标 {snapshot.targets.filter(target => target.health > 0).length} · 玩家 {snapshot.players.length}/2</Text>}
                {snapshot?.result && <Text type="label">{snapshot.result.winnerId === playerId ? '任务完成 / 本场获胜' : snapshot.result.winnerId ? '本场结束 / 对手获胜' : '本场结束'} · 结果编号 {snapshot.result.resultId}</Text>}
                {connectedRoom && <HStack gap={2} wrap="wrap"><Text type="code">房间 {connectedRoom}</Text><Button label="复制房间号" size="sm" variant="ghost" onClick={() => void copyRoom()} /></HStack>}
              </VStack>
            </Section>
            <Section variant="section" padding={4}>
              <VStack gap={4}>
                <Heading level={2}>驾驶控制</Heading>
                <Text type="supporting" color="secondary">鼠标：单击战场后移动鼠标控制视角，Esc 释放；也可按住右键拖动。WASD 移动 · 空格射击 · Shift 推进 · E 升空。触屏按钮与瞄准滑杆仍可使用。</Text>
                <HStack gap={2} wrap="wrap">
                  {(Object.keys(CONTROL_LABELS) as ControlAction[]).map(action => <HoldButton key={action} action={action} held={held} label={CONTROL_LABELS[action]} />)}
                </HStack>
                <Slider label="水平朝向" min={-180} max={180} step={1} value={yawDegrees} onChange={changeYaw} valueDisplay="text" formatValue={value => `${value}°`} />
                <Slider label="瞄准仰角" min={-30} max={40} step={1} value={pitchDegrees} onChange={changePitch} valueDisplay="text" formatValue={value => `${value}°`} />
              </VStack>
            </Section>
          </VStack>
        </StackItem>
        <VStack gap={6} width={wide ? 330 : '100%'}>
          <Section variant="section" padding={5}>
            <VStack gap={4}>
              <HStack gap={2}><Icon icon={ArrowUpTrayIcon} /><Heading level={2}>我的机体</Heading></HStack>
              <Text type="supporting" color="secondary">先给标准骨架换一件外壳。你的文件只在本机预览。</Text>
              <FileInput label="导入躯干外观" accept=".glb" value={file} onChange={(value: File | File[] | null) => setFile(Array.isArray(value) ? value[0] ?? null : value)} maxSize={20 * 1024 * 1024} mode="dropzone" placeholder="选择 GLB 文件" description="GLB 2.0 · 最大 20 MB · 静态、自包含网格" />
              <Text type="supporting" role="status">{importStatus}</Text>
              <Text type="supporting" color="secondary">本版外壳不改变碰撞体、质量或武器；其他玩家仍看到标准机体。照片生成与自动骨骼尚未接入。</Text>
            </VStack>
          </Section>
          <Section variant="section" padding={5}>
            <VStack gap={4}>
              <Heading level={2}>机械试验台</Heading>
              <Text type="supporting" color="secondary">MuJoCo 真实计算双关节机械臂。加重末端，观察有限扭矩还能否到达目标。</Text>
              <Slider label="末端负载" min={0.1} max={5} step={0.1} value={payloadKg} onChange={(value: number | [number, number]) => {setPayloadKg(Number(value)); setLab(null);}} formatValue={value => `${value.toFixed(1)} kg`} valueDisplay="text" />
              <Button label="运行机械验证" variant="secondary" onClick={() => void checkLab()} isLoading={labBusy} />
              {labError && <Text role="alert">{labError}</Text>}
              {lab && <VStack gap={2}>
                <Text type="label">{lab.status === 'passed' ? '通过 · 达到目标精度' : '需要调整 · 跟踪误差过大'}</Text>
                <Text type="code">误差 {lab.trackingError.toFixed(3)} rad / 容差 {lab.conditions.passToleranceRad} rad</Text>
                <Text type="supporting">峰值扭矩 {lab.peakControl.toFixed(2)} N·m · 饱和 {lab.saturatedSteps}/{lab.steps} 步</Text>
                <Text type="supporting" color="secondary">MuJoCo {lab.version} · 负载 {lab.conditions.payloadKg} kg · {lab.conditions.simulatedSeconds} 秒仿真</Text>
              </VStack>}
              <Text type="supporting" color="secondary">这是独立机械臂实验，不代表导入机体通过完整验证，也不参与对战判定。</Text>
            </VStack>
          </Section>
          <Section variant="section" padding={5}>
            <VStack gap={4}>
              <Heading level={2}>和朋友对战</Heading>
              <Text type="supporting" color="secondary">一人进入双人对战，再把房间号发给另一人。</Text>
              <TextInput label="朋友的房间号" placeholder="输入房间号" value={roomId} onChange={setRoomId} />
              <Button label="加入指定房间" variant="secondary" isDisabled={connecting || !roomId.trim()} onClick={() => void connect('friend')} />
            </VStack>
          </Section>
        </VStack>
      </Stack>
      <Section padding={4} variant="muted">
        <VStack gap={2}>
          <Text type="label">统一规则 · 实际能力</Text>
          <Text type="supporting" color="secondary">Three.js 呈现机体；Rapier 在服务器计算运动与命中；Colyseus 同步房间；MuJoCo 提供独立机械试验。当前规则 {CATALOG.ruleset}，固定标准机体 {CATALOG.cp} CP。</Text>
          <Text type="supporting" color="secondary">本版免费本地原型，未扣除 token、未连接外部模型 API。联机不含账户、排位和永久战绩；默认仅监听本机。跨设备需部署到同一可访问服务器，手机与平板性能仍待真机验证。</Text>
        </VStack>
      </Section>
    </VStack>
  </AppShell>;
}
