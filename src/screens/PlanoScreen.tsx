import { Assistente } from './plano/Assistente';
import { Capital } from './plano/Capital';
import { Dividas } from './plano/Dividas';
import { Evolucao } from './plano/Evolucao';
import { Projecao } from './plano/Projecao';
import { Regras } from './plano/Regras';
import { Reserva } from './plano/Reserva';

export function PlanoScreen() {
  return (
    <div className="stack">
      <h1>Plano</h1>
      <Assistente />
      <Reserva />
      <Dividas />
      <Capital />
      <Projecao />
      <Evolucao />
      <Regras />
    </div>
  );
}
