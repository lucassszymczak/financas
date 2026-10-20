/**
 * Bandeiras (quadradas) do pacote flag-icons (MIT), empacotadas no build: funcionam sem internet.
 * Só entram as dos países usados em `paises.ts`.
 */
import ar from 'flag-icons/flags/1x1/ar.svg';
import au from 'flag-icons/flags/1x1/au.svg';
import br from 'flag-icons/flags/1x1/br.svg';
import ca from 'flag-icons/flags/1x1/ca.svg';
import ch from 'flag-icons/flags/1x1/ch.svg';
import cn from 'flag-icons/flags/1x1/cn.svg';
import de from 'flag-icons/flags/1x1/de.svg';
import eu from 'flag-icons/flags/1x1/eu.svg';
import fr from 'flag-icons/flags/1x1/fr.svg';
import gb from 'flag-icons/flags/1x1/gb.svg';
import hk from 'flag-icons/flags/1x1/hk.svg';
import jp from 'flag-icons/flags/1x1/jp.svg';
import kr from 'flag-icons/flags/1x1/kr.svg';
import mx from 'flag-icons/flags/1x1/mx.svg';
import us from 'flag-icons/flags/1x1/us.svg';

export const BANDEIRAS: Record<string, string> = { ar, au, br, ca, ch, cn, de, eu, fr, gb, hk, jp, kr, mx, us };

export const NOMES_PAISES: Record<string, string> = {
  ar: 'Argentina',
  au: 'Austrália',
  br: 'Brasil',
  ca: 'Canadá',
  ch: 'Suíça',
  cn: 'China',
  de: 'Alemanha',
  eu: 'Zona do euro',
  fr: 'França',
  gb: 'Reino Unido',
  hk: 'Hong Kong',
  jp: 'Japão',
  kr: 'Coreia do Sul',
  mx: 'México',
  us: 'Estados Unidos',
};
