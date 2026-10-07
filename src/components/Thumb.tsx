import { useEffect, useState } from 'react';

/** Miniatura de uma imagem guardada em Blob. */
export function Thumb({ blob, size = 64, alt = 'Miniatura do comprovante' }: { blob: Blob; size?: number; alt?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  if (!url) return null;
  if (blob.type === 'application/pdf') return <span className="badge">PDF</span>;
  return (
    <img
      src={url}
      alt={alt}
      width={size}
      height={size}
      style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)', flex: 'none' }}
    />
  );
}
