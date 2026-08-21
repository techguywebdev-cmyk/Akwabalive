'use client';

interface PhotoStripProps {
  photos: string[];
  onSelect: (src: string) => void;
}

export default function PhotoStrip({ photos, onSelect }: PhotoStripProps) {
  if (!photos.length) return null;

  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        paddingBottom: 4,
        marginBottom: 12,
        scrollbarWidth: 'none',
      }}
    >
      {photos.map((src, i) => (
        <button
          key={i}
          onClick={() => onSelect(src)}
          aria-label={`View photo ${i + 1}`}
          style={{
            width: 52,
            height: 52,
            borderRadius: 8,
            flexShrink: 0,
            backgroundImage: `url(${src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '1px solid rgba(255,255,255,0.15)',
            cursor: 'pointer',
            padding: 0,
            outline: 'none',
          }}
        />
      ))}
    </div>
  );
}
