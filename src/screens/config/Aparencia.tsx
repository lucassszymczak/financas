import { SelectField } from '../../components/Field';
import { useSettings } from '../../hooks/useData';
import { updateSettings } from '../../lib/db/settings';

export function Aparencia() {
  const s = useSettings();
  if (!s) return null;
  return (
    <section className="card stack" aria-labelledby="ap-titulo">
      <h2 id="ap-titulo">Aparência</h2>
      <SelectField
        label="Tema"
        value={s.tema}
        onChange={(tema) => updateSettings({ tema })}
        options={[
          { value: 'auto', label: 'Automático (do sistema)' },
          { value: 'light', label: 'Claro' },
          { value: 'dark', label: 'Escuro' },
        ]}
      />
    </section>
  );
}
