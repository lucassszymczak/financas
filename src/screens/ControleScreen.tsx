import { Calendario } from './controle/Calendario';
import { Fechamento } from './controle/Fechamento';
import { Recorrencias } from './controle/Recorrencias';
import { Simulador } from './controle/Simulador';
import { Tetos } from './controle/Tetos';

export function ControleScreen() {
  return (
    <div className="stack">
      <h1>Controle</h1>
      <Fechamento />
      <Tetos />
      <Calendario />
      <Recorrencias />
      <Simulador />
    </div>
  );
}
