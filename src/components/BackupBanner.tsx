import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useSettings } from '../hooks/useData';
import { diasDesdeBackup, temDados } from '../lib/backup/backup';
import { db } from '../lib/db/db';
import { lembretePendente, limparLembreteBackup, onLembreteBackup } from '../lib/lembretes';
import { go } from '../router';

export function BackupBanner() {
  const s = useSettings();
  const existeDado = useLiveQuery(() => temDados(db), []);
  const [lembrete, setLembrete] = useState<string | null>(() => lembretePendente());
  useEffect(() => onLembreteBackup(setLembrete), []);

  if (!s || !existeDado) return null;
  const dias = diasDesdeBackup(s.ultimoBackup);
  const atrasado = dias === null || dias > 7;
  if (!atrasado && !lembrete) return null;

  const texto = lembrete
    ? `${lembrete} Bom momento para um backup.`
    : dias === null
      ? 'Você ainda não fez backup.'
      : `Último backup há ${dias} dias.`;

  return (
    <div className="banner" role="status">
      <span>{texto}</span>
      <div className="row">
        <button
          type="button"
          className="btn"
          onClick={() => {
            limparLembreteBackup();
            go('config');
            setTimeout(() => document.getElementById('backup')?.scrollIntoView(), 50);
          }}
        >
          Fazer backup
        </button>
        {lembrete && !atrasado && (
          <button type="button" className="btn btn-ghost" aria-label="Dispensar" onClick={limparLembreteBackup}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
