import { useState } from 'react';
import { MoneyInput } from '../../components/MoneyInput';
import { Sheet } from '../../components/Sheet';

/** Pede um valor em reais e confirma. */
export function ValorSheet(props: {
  titulo: string;
  rotulo: string;
  botao: string;
  inicial?: number | null;
  onConfirm: (v: number) => unknown;
  onClose: () => void;
}) {
  const [v, setV] = useState<number | null>(props.inicial ?? null);
  return (
    <Sheet open onClose={props.onClose} title={props.titulo}>
      <MoneyInput label={props.rotulo} value={v} onChange={setV} autoFocus />
      <button
        type="button"
        className="btn btn-primary"
        disabled={v === null || v < 0}
        onClick={async () => {
          await props.onConfirm(v ?? 0);
          props.onClose();
        }}
      >
        {props.botao}
      </button>
    </Sheet>
  );
}
