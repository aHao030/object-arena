import {useEffect, useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {BINDING_LABELS, DEFAULT_BINDINGS, changeBinding, formatKey, type BindingAction, type Bindings} from './keyBindings';

export function KeySettings({bindings, onChange, onEditingChange, storageNotice}: {
  bindings: Bindings; onChange(bindings: Bindings): void;
  onEditingChange(editing: boolean): void; storageNotice: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<BindingAction | null>(null);
  const [message, setMessage] = useState('选择动作后，按下要使用的单个按键。Esc 取消。');
  useEffect(() => {
    if (!pending) return;
    const capture = (event: KeyboardEvent) => {
      // Preserve browser shortcuts and normal Tab navigation even during rebinding.
      if (event.ctrlKey || event.metaKey || event.altKey || event.code === 'Tab') return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.code === 'Escape') {setPending(null); setMessage('已取消修改。'); return;}
      if (event.repeat) return;
      const result = changeBinding(bindings, pending, event.code);
      if (!result.ok) {setMessage(result.message); return;}
      onChange(result.bindings); setPending(null);
      setMessage(`${BINDING_LABELS[pending]}已改为 ${formatKey(result.bindings[pending])}。`);
    };
    const cancel = () => setPending(null);
    window.addEventListener('keydown', capture, true); window.addEventListener('blur', cancel);
    return () => {window.removeEventListener('keydown', capture, true); window.removeEventListener('blur', cancel);};
  }, [pending, bindings, onChange]);
  const toggle = () => {const next = !open; setOpen(next); setPending(null); onEditingChange(next);};
  return <VStack gap={3}>
    <HStack gap={2} wrap="wrap">
      <Button label={open ? '完成键位设置' : '修改键位'} size="sm" variant="secondary" onClick={toggle} />
      <Text type="supporting" color="secondary">左键固定射击 · {storageNotice}</Text>
    </HStack>
    {open && <VStack gap={2}>
      <Text type="supporting">设置期间暂停驾驶输入，机体仍受重力和对战影响。完成后点击战场继续。</Text>
      {(Object.keys(BINDING_LABELS) as BindingAction[]).map(action => <HStack key={action} gap={3} wrap="wrap" hAlign="between" vAlign="center">
        <Text>{BINDING_LABELS[action]}</Text>
        <Button label={pending === action ? `等待${BINDING_LABELS[action]}按键…` : `更改${BINDING_LABELS[action]}（${formatKey(bindings[action])}）`}
          size="sm" variant={pending === action ? 'primary' : 'secondary'} onClick={() => {
            setPending(action); setMessage(`请按下${BINDING_LABELS[action]}的新按键，Esc 取消。`);
          }} />
      </HStack>)}
      <Text role="status" aria-live="polite" type="supporting">{message}</Text>
      <Button label="恢复默认键位" size="sm" variant="ghost" onClick={() => {
        setPending(null); onChange({...DEFAULT_BINDINGS}); setMessage('已恢复默认键位。');
      }} />
    </VStack>}
  </VStack>;
}
