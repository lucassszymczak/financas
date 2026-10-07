import { formatBRL, formatBRLSigned } from '../lib/money';

export function Money({
  value,
  signed,
  color,
  semCentavos,
}: {
  value: number;
  signed?: boolean;
  color?: boolean;
  semCentavos?: boolean;
}) {
  const cls = color ? (value > 0 ? 'pos' : value < 0 ? 'neg' : '') : '';
  return (
    <span className={`money ${cls}`}>{signed ? formatBRLSigned(value, { semCentavos }) : formatBRL(value, { semCentavos })}</span>
  );
}
