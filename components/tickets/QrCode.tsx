'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** A real, scannable QR code drawn as crisp SVG (dark modules on white). */
export default function QrCode({ value, size = 240, label }: { value: string; size?: number; label: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let live = true;
    QRCode.toString(value, { type: 'svg', errorCorrectionLevel: 'M', margin: 0, color: { dark: '#03130B', light: '#FFFFFF' } })
      .then((s) => { if (live) setSvg(s); })
      .catch(() => { if (live) setSvg(''); });
    return () => { live = false; };
  }, [value]);

  return (
    <div
      role="img"
      aria-label={label}
      style={{ width: size, height: size, background: '#fff' }}
      // The SVG comes from the qrcode library, not from user input
      dangerouslySetInnerHTML={{ __html: svg.replace('<svg ', '<svg width="100%" height="100%" shape-rendering="crispEdges" ') }}
    />
  );
}
