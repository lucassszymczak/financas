import { useEffect, useState } from 'react';
import { MoneyInput } from '../../components/MoneyInput';
import { SelectField, TextField } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { useSettings } from '../../hooks/useData';
import { updateSettings } from '../../lib/db/settings';
import type { ModoLongevidade } from '../../lib/db/schemas';
import { isValidMonth } from '../../lib/dates';

export function ValoresIniciais() {
  const s = useSettings();
  const toast = useToast();
  const [form, setForm] = useState({
    reserva: 0 as number | null,
    capital: 0 as number | null,
    salario: 0 as number | null,
    fipe: 0 as number | null,
    juros: 0 as number | null,
    modo: '2/2' as ModoLongevidade,
    ultimo: '',
  });

  useEffect(() => {
    if (!s) return;
    setForm({
      reserva: s.reserva,
      capital: s.capital,
      salario: s.salarioBaseLongevidade,
      fipe: s.fipeCarro,
      juros: s.jurosPagos,
      modo: s.longevidadeModo,
      ultimo: s.ultimoMesAplicado ?? '',
    });
  }, [s]);

  if (!s) return null;
  const mesOk = form.ultimo === '' || isValidMonth(form.ultimo);

  return (
    <section className="card stack" aria-labelledby="vi-titulo">
      <h2 id="vi-titulo">Valores iniciais</h2>
      <div className="grid-2">
        <MoneyInput label="Reserva" value={form.reserva} onChange={(v) => setForm({ ...form, reserva: v })} />
        <MoneyInput label="Capital social" value={form.capital} onChange={(v) => setForm({ ...form, capital: v })} />
        <MoneyInput label="Salário base do Longevidade" value={form.salario} onChange={(v) => setForm({ ...form, salario: v })} />
        <SelectField
          label="Longevidade"
          value={form.modo}
          onChange={(v) => setForm({ ...form, modo: v })}
          options={[
            { value: '2/2', label: '2/2' },
            { value: '6/6', label: '6/6' },
          ]}
        />
        <TextField
          label="Último mês aplicado"
          type="month"
          value={form.ultimo}
          placeholder="AAAA-MM"
          onChange={(v) => setForm({ ...form, ultimo: v })}
          hint={mesOk ? 'Último mês com parcelas já descontadas.' : 'Use o formato AAAA-MM.'}
        />
        <MoneyInput label="Juros já pagos" value={form.juros} onChange={(v) => setForm({ ...form, juros: v })} />
        <MoneyInput label="FIPE do carro" value={form.fipe} onChange={(v) => setForm({ ...form, fipe: v })} />
      </div>
      <button
        type="button"
        className="btn btn-primary"
        disabled={!mesOk}
        onClick={async () => {
          await updateSettings({
            reserva: form.reserva ?? 0,
            capital: form.capital ?? 0,
            salarioBaseLongevidade: form.salario ?? 0,
            fipeCarro: form.fipe ?? 0,
            jurosPagos: form.juros ?? 0,
            longevidadeModo: form.modo,
            ultimoMesAplicado: form.ultimo || null,
          });
          toast.show('Valores salvos');
        }}
      >
        Salvar valores
      </button>
    </section>
  );
}
