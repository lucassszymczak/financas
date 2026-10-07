import { useId, type ReactNode } from 'react';

export function TextField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: 'text' | 'decimal' | 'numeric';
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{props.label}</span>
      <input
        id={id}
        className="input"
        type={props.type ?? 'text'}
        value={props.value}
        placeholder={props.placeholder}
        inputMode={props.inputMode}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {props.hint && <small className="muted small">{props.hint}</small>}
    </label>
  );
}

export function SelectField<T extends string>(props: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly (T | { value: T; label: string })[];
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{props.label}</span>
      <select id={id} className="input" value={props.value} onChange={(e) => props.onChange(e.target.value as T)}>
        {props.options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          const l = typeof o === 'string' ? o : o.label;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export function Check(props: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
      <span>{props.label}</span>
    </label>
  );
}
