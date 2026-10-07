import { Icon, type IconName } from './components/Icon';
import { useRoute, type Route } from './router';
import { CapturarScreen } from './screens/CapturarScreen';
import { MesScreen } from './screens/MesScreen';
import { ControleScreen } from './screens/ControleScreen';
import { PlanoScreen } from './screens/PlanoScreen';
import { RespostasScreen } from './screens/RespostasScreen';
import { IrScreen } from './screens/IrScreen';
import { ConfigScreen } from './screens/ConfigScreen';

const TABS: { route: Route; label: string; icon: IconName }[] = [
  { route: 'capturar', label: 'Capturar', icon: 'camera' },
  { route: 'mes', label: 'Mês', icon: 'calendar' },
  { route: 'controle', label: 'Controle', icon: 'gauge' },
  { route: 'plano', label: 'Plano', icon: 'target' },
  { route: 'respostas', label: 'Respostas', icon: 'chat' },
  { route: 'ir', label: 'IR', icon: 'receipt' },
  { route: 'config', label: 'Ajustes', icon: 'gear' },
];

function Screen({ route }: { route: Route }) {
  switch (route) {
    case 'capturar':
      return <CapturarScreen />;
    case 'mes':
      return <MesScreen />;
    case 'controle':
      return <ControleScreen />;
    case 'plano':
      return <PlanoScreen />;
    case 'respostas':
      return <RespostasScreen />;
    case 'ir':
      return <IrScreen />;
    case 'config':
      return <ConfigScreen />;
  }
}

export function App() {
  const route = useRoute();
  return (
    <div className="app">
      <nav className="tabs" aria-label="Seções">
        <div className="brand">Plano Patrimonial</div>
        {TABS.map((t) => (
          <a key={t.route} className="tab" href={`#/${t.route}`} aria-current={route === t.route ? 'page' : undefined}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </a>
        ))}
      </nav>
      <main className="main">
        <Screen route={route} />
      </main>
    </div>
  );
}
