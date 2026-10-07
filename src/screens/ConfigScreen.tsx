import { Aparencia } from './config/Aparencia';
import { BackupSection } from './config/BackupSection';
import { DicionarioEditor } from './config/DicionarioEditor';
import { DividasEditor } from './config/DividasEditor';
import { FixosEditor } from './config/FixosEditor';
import { ValoresIniciais } from './config/ValoresIniciais';

export function ConfigScreen() {
  return (
    <div className="stack">
      <h1>Configuração e backup</h1>
      <BackupSection />
      <ValoresIniciais />
      <DividasEditor />
      <FixosEditor />
      <DicionarioEditor />
      <Aparencia />
    </div>
  );
}
