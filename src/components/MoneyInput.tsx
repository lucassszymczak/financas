import { useEffect, useId, useState } from 'react';
import { formatDecimalBR, parseMoney } from '../lib/money';

function show(v: number | null): string {
  if (v === null) return '';
  const s = formatDecimalBR(Math.abs(v));
  const [int, dec] = s.split(',');
  const withThousands = (int ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${v < 0 ? '-' : ''}${withThousands},${dec}`;
}

type Props = {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  allowNegative?: boolean;
  placeholder?: string;
  hint?: string;
  autoFocus?: boolean;
  name?: string;
};

/** Campo de valor em reais. Aceita "1.234,56", "1234.56", "87". */
export function MoneyInput({ label, value, onChange, allowNegative, placeholder, hint, autoFocus, name }: Props) {
  const id = useId();
  const [text, setText] = useState(show(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(show(value));
  }, [value, focused]);

  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        name={name}
        className="input money"
        inputMode={allowNegative ? 'text' : 'decimal'}
        autoComplete="off"
        placeholder={placeholder ?? '0,00'}
        value={text}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setText(show(value));
        }}
        onChange={(e) => {
          setText(e.target.value);
          const parsed = parseMoney(e.target.value);
          if (parsed === null) onChange(null);
          else onChange(allowNegative ? parsed : Math.abs(parsed));
        }}
      />
      {hint && <small className="muted small">{hint}</small>}
    </label>
  );
}
