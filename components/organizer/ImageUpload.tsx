'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const C = {
  bg: '#0D0B08', bg2: '#141109', bg3: '#1C1710',
  gold: '#C8922A', goldDim: 'rgba(200,146,42,0.14)', goldBd: 'rgba(200,146,42,0.28)',
  cream: '#F5ECD7', c2: 'rgba(245,236,215,0.55)', c3: 'rgba(245,236,215,0.24)',
  bd: 'rgba(245,236,215,0.07)', red: '#CE1126',
  greenL: '#4ade80', greenDim: 'rgba(45,106,79,0.15)', greenBd: 'rgba(45,106,79,0.35)',
};

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUpload({ value, onChange, label = 'Cover Image' }: ImageUploadProps) {
  const supabase   = createClient();
  const inputRef   = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);

  async function handleFile(file: File) {
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WebP)');
      return;
    }

    // Validate size — max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }

    setError('');
    setUploading(true);
    setSuccess(false);

    try {
      const ext      = file.name.split('.').pop() ?? 'jpg';
      const filename = `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path     = `events/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('event-images').getPublicUrl(path);
      onChange(data.publicUrl);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message ?? 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 8 }}>
        {label}
      </label>

      {/* Preview */}
      {value && (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <div style={{ height: 180, borderRadius: 10, overflow: 'hidden', backgroundImage: `url(${value})`, backgroundSize: 'cover', backgroundPosition: 'center', border: `1px solid ${C.bd}` }} />
          <button
            onClick={() => onChange('')}
            style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(13,11,8,0.85)', border: `1px solid ${C.bd}`, color: C.c2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} />
          </button>
          {success && (
            <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', alignItems: 'center', gap: 5, background: C.greenDim, border: `1px solid ${C.greenBd}`, borderRadius: 6, padding: '4px 10px' }}>
              <CheckCircle size={11} style={{ color: C.greenL }} />
              <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1px', color: C.greenL }}>Uploaded</span>
            </div>
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        style={{
          border: `2px dashed ${uploading ? C.gold : C.bd}`,
          borderRadius: 10,
          padding: '24px 20px',
          textAlign: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          background: uploading ? C.goldDim : C.bg3,
          transition: 'all 200ms',
        }}
      >
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <Loader2 size={24} style={{ color: C.gold, animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold }}>Uploading…</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.goldDim, border: `1px solid ${C.goldBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={18} style={{ color: C.gold }} />
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 14, color: C.c2, fontWeight: 500, marginBottom: 4 }}>
                {value ? 'Replace image' : 'Upload cover image'}
              </p>
              <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.c3 }}>
                Tap to select or drag & drop · JPG, PNG, WebP · Max 5MB
              </p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInput}
        style={{ display: 'none' }}
      />

      {error && (
        <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: '#f87171', marginTop: 8 }}>{error}</p>
      )}

      {/* URL fallback */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 1, background: C.bd }} />
        <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c3 }}>or paste URL</span>
        <div style={{ flex: 1, height: 1, background: C.bd }} />
      </div>
      <input
        type="url"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="https://images.unsplash.com/…"
        style={{ width: '100%', background: C.bg3, border: `1px solid ${C.bd}`, borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.cream, outline: 'none', marginTop: 10 }}
      />
    </div>
  );
}
