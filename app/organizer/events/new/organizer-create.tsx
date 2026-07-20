'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, Loader2,
  Calendar, MapPin, Clock, Tag, Image as ImageIcon,
  CheckCircle, AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import Nav from '@/components/layout/Nav';

const C = {
  bg: '#0D0B08', bg2: '#141109', bg3: '#1C1710',
  gold: '#C8922A', goldDim: 'rgba(200,146,42,0.14)', goldBd: 'rgba(200,146,42,0.28)',
  cream: '#F5ECD7', c2: 'rgba(245,236,215,0.55)', c3: 'rgba(245,236,215,0.24)',
  c4: 'rgba(245,236,215,0.08)', bd: 'rgba(245,236,215,0.07)',
  red: '#CE1126', greenL: '#4ade80',
  greenDim: 'rgba(45,106,79,0.15)', greenBd: 'rgba(45,106,79,0.35)',
  greenSolid: '#2D6A4F',
};

const CATEGORIES = ['festival','concert','food','nightlife','culture','sports','tech','art','fashion','wellness'];
const CITIES     = ['accra','kumasi','cape-coast','tamale','takoradi','ho'];
const CITY_LABELS: Record<string,string> = {
  'accra':'Accra','kumasi':'Kumasi','cape-coast':'Cape Coast',
  'tamale':'Tamale','takoradi':'Takoradi','ho':'Ho',
};
const REGIONS: Record<string,string> = {
  'accra':'Greater Accra','kumasi':'Ashanti','cape-coast':'Central',
  'tamale':'Northern','takoradi':'Western','ho':'Volta',
};

interface Tier { name: string; description: string; price: string; quantity: string; }

function Input({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', background: C.bg3, border: `1px solid ${C.bd}`,
  borderRadius: 8, padding: '12px 14px',
  fontFamily: 'var(--font-inter,sans-serif)', fontSize: 14,
  color: C.cream, outline: 'none',
};

export default function CreateEventPage() {
  const router   = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [step,    setStep]    = useState<1|2|3>(1);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState('');
  const [city,        setCity]        = useState('');
  const [venue,       setVenue]       = useState('');
  const [date,        setDate]        = useState('');
  const [time,        setTime]        = useState('');
  const [endTime,     setEndTime]     = useState('');
  const [imageUrl,    setImageUrl]    = useState('');

  const [tiers, setTiers] = useState<Tier[]>([
    { name: 'General', description: 'Standard entry', price: '', quantity: '100' },
  ]);

  function addTier() {
    setTiers(t => [...t, { name: '', description: '', price: '', quantity: '50' }]);
  }

  function removeTier(i: number) {
    setTiers(t => t.filter((_, idx) => idx !== i));
  }

  function updateTier(i: number, field: keyof Tier, value: string) {
    setTiers(t => t.map((tier, idx) => idx === i ? { ...tier, [field]: value } : tier));
  }

  function generateSlug(t: string) {
    return t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60)
      + '-' + Math.random().toString(36).slice(2, 8);
  }

  function formatDateLabel(d: string) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  async function handlePublish(status: 'draft' | 'published') {
    if (!user) { window.location.href = '/auth'; return; }
    setError(''); setSaving(true);
    try {
      const { data: ev, error: evErr } = await supabase.from('events').insert({
        organizer_id: user.id,
        title: title.trim(), slug: generateSlug(title),
        description: description.trim(), category, city,
        region: REGIONS[city] ?? city, venue: venue.trim(),
        date, date_label: formatDateLabel(date), time,
        end_time: endTime, image_url: imageUrl.trim() || null, status,
      }).select().single();

      if (evErr) throw evErr;

      const tierRows = tiers.filter(t => t.name.trim()).map(t => ({
        event_id: ev.id, name: t.name.trim(),
        description: t.description.trim(),
        price: parseFloat(t.price) || 0,
        quantity: parseInt(t.quantity) || 100, sold: 0,
      }));
      if (tierRows.length > 0) {
        const { error: tErr } = await supabase.from('ticket_tiers').insert(tierRows);
        if (tErr) throw tErr;
      }
      setSuccess(true);
      setTimeout(() => router.push('/organizer/dashboard'), 1500);
    } catch (err: any) {
      setError(err.message ?? 'Could not create event. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const step1Valid = !!(title && category && city && venue && date && time);
  const step2Valid = tiers.length > 0 && tiers.every(t => t.name && t.quantity);

  const STEPS = ['Event Details', 'Ticket Tiers', 'Review & Publish'];

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <Nav active="Events" />
      <div style={{ paddingTop: 62, maxWidth: 680, margin: '0 auto', padding: '80px 20px 80px' }}>

        <div style={{ marginBottom: 32 }}>
          <Link href="/organizer/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3, textDecoration: 'none', marginBottom: 20 }}>
            <ArrowLeft size={12} /> Dashboard
          </Link>
          <h1 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 32, fontWeight: 300, color: C.cream, letterSpacing: '-1px', marginBottom: 24 }}>
            Create Event
          </h1>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {STEPS.map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: step > i + 1 ? C.greenSolid : step === i + 1 ? C.gold : C.bg3,
                    border: `1px solid ${step > i + 1 ? C.greenBd : step === i + 1 ? C.gold : C.bd}`,
                    fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 10, fontWeight: 600,
                    color: step >= i + 1 ? '#000' : C.c3, flexShrink: 0,
                  }}>
                    {step > i + 1 ? <CheckCircle size={14} style={{ color: '#fff' }} /> : i + 1}
                  </div>
                  <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '1.5px', textTransform: 'uppercase', color: step === i + 1 ? C.gold : C.c3, whiteSpace: 'nowrap' }}>{label}</span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 1, background: C.bd, margin: '0 12px' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 14, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag size={11} /> Basic Information
              </p>
              <Input label="Event Title *">
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Rapperholic 2025" style={inputStyle} />
              </Input>
              <Input label="Description">
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Tell people what to expect."
                  rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
              </Input>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Input label="Category *">
                  <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Select…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </Input>
                <Input label="City *">
                  <select value={city} onChange={e => setCity(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Select…</option>
                    {CITIES.map(c => <option key={c} value={c}>{CITY_LABELS[c]}</option>)}
                  </select>
                </Input>
              </div>
              <Input label="Venue *">
                <input type="text" value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g. Accra Sports Stadium" style={inputStyle} />
              </Input>
            </div>

            <div style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 14, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={11} /> Date & Time
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Input label="Date *">
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
                </Input>
                <Input label="Start Time *">
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
                </Input>
              </div>
              <Input label="End Time (optional)">
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle} />
              </Input>
            </div>

            <div style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 14, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ImageIcon size={11} /> Cover Image
              </p>
              <Input label="Image URL">
                <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://images.unsplash.com/…" style={inputStyle} />
              </Input>
              {imageUrl && <div style={{ height: 160, borderRadius: 8, backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', border: `1px solid ${C.bd}` }} />}
              <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.c3, lineHeight: 1.6 }}>
                Paste any image URL. Full image upload coming soon.
              </p>
            </div>

            <button onClick={() => step1Valid && setStep(2)} disabled={!step1Valid}
              style={{ width: '100%', background: step1Valid ? C.gold : C.bg3, color: step1Valid ? '#0D0B08' : C.c3, border: `1px solid ${step1Valid ? C.gold : C.bd}`, padding: 15, borderRadius: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, cursor: step1Valid ? 'pointer' : 'not-allowed', transition: 'all 200ms' }}>
              Continue to Ticket Tiers →
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tiers.map((tier, i) => (
              <div key={i} style={{ background: C.bg2, border: `1px solid ${i === 0 ? C.goldBd : C.bd}`, borderRadius: 14, padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75 }}>
                    Tier {i + 1}
                  </span>
                  {tiers.length > 1 && (
                    <button onClick={() => removeTier(i)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1px', textTransform: 'uppercase', border: '1px solid rgba(206,17,38,0.2)', background: 'transparent', color: 'rgba(206,17,38,0.6)', padding: '6px 10px', borderRadius: 5, cursor: 'pointer' }}>
                      <Trash2 size={10} /> Remove
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Input label="Tier Name *">
                    <input type="text" value={tier.name} onChange={e => updateTier(i, 'name', e.target.value)} placeholder="e.g. General, VIP, VVIP" style={inputStyle} />
                  </Input>
                  <Input label="Description">
                    <input type="text" value={tier.description} onChange={e => updateTier(i, 'description', e.target.value)} placeholder="What does this tier include?" style={inputStyle} />
                  </Input>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Input label="Price (₵)">
                      <input type="number" value={tier.price} onChange={e => updateTier(i, 'price', e.target.value)} placeholder="0 for free" min="0" style={inputStyle} />
                    </Input>
                    <Input label="Quantity *">
                      <input type="number" value={tier.quantity} onChange={e => updateTier(i, 'quantity', e.target.value)} placeholder="100" min="1" style={inputStyle} />
                    </Input>
                  </div>
                </div>
              </div>
            ))}

            {tiers.length < 4 && (
              <button onClick={addTier}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: `1px dashed ${C.bd}`, background: 'transparent', color: C.c3, padding: '14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', width: '100%' }}>
                <Plus size={13} /> Add Another Tier
              </button>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, background: 'transparent', color: C.c2, border: `1px solid ${C.bd}`, padding: 14, borderRadius: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>
                ← Back
              </button>
              <button onClick={() => step2Valid && setStep(3)} disabled={!step2Valid}
                style={{ flex: 2, background: step2Valid ? C.gold : C.bg3, color: step2Valid ? '#0D0B08' : C.c3, border: `1px solid ${step2Valid ? C.gold : C.bd}`, padding: 14, borderRadius: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, cursor: step2Valid ? 'pointer' : 'not-allowed', transition: 'all 200ms' }}>
                Review Event →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 14, overflow: 'hidden' }}>
              {imageUrl && <div style={{ height: 200, backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.6)' }} />}
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 9px', borderRadius: 3, background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}` }}>{category}</span>
                  <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 9px', borderRadius: 3, background: C.c4, color: C.c3, border: `1px solid ${C.bd}` }}>{CITY_LABELS[city]}</span>
                </div>
                <h2 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 26, fontWeight: 300, color: C.cream, lineHeight: 1.1, marginBottom: 12 }}>{title}</h2>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.c3, marginBottom: 14 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={11} style={{ color: C.gold }} />{formatDateLabel(date)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={11} style={{ color: C.gold }} />{time}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MapPin size={11} style={{ color: C.gold }} />{venue}</span>
                </div>
                {description && <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c2, lineHeight: 1.7, marginBottom: 16 }}>{description.slice(0, 200)}{description.length > 200 ? '\u2026' : ''}</p>}

                <div style={{ borderTop: `1px solid ${C.bd}`, paddingTop: 16 }}>
                  <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 10 }}>Ticket Tiers</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tiers.map((t, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: C.bg3, borderRadius: 8, border: `1px solid ${C.bd}` }}>
                        <div>
                          <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.cream, fontWeight: 500 }}>{t.name}</p>
                          <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3 }}>{t.quantity} tickets</p>
                        </div>
                        <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 16, color: parseFloat(t.price) === 0 ? C.greenL : C.cream, letterSpacing: '-0.5px' }}>
                          {parseFloat(t.price) === 0 ? 'FREE' : `\u20B5${parseFloat(t.price).toLocaleString()}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(206,17,38,0.1)', border: '1px solid rgba(206,17,38,0.25)', borderRadius: 8, padding: '12px 14px' }}>
                <AlertCircle size={14} style={{ color: C.red, flexShrink: 0 }} />
                <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: '#f87171' }}>{error}</p>
              </div>
            )}
            {success && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.greenDim, border: `1px solid ${C.greenBd}`, borderRadius: 8, padding: '12px 14px' }}>
                <CheckCircle size={14} style={{ color: C.greenL, flexShrink: 0 }} />
                <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.greenL }}>Event created! Redirecting…</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} disabled={saving}
                style={{ flex: 1, background: 'transparent', color: C.c2, border: `1px solid ${C.bd}`, padding: 14, borderRadius: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>
                ← Back
              </button>
              <button onClick={() => handlePublish('draft')} disabled={saving || success}
                style={{ flex: 1, background: 'transparent', color: C.c2, border: `1px solid ${C.bd}`, padding: 14, borderRadius: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                Save Draft
              </button>
              <button onClick={() => handlePublish('published')} disabled={saving || success}
                style={{ flex: 2, background: saving || success ? C.greenSolid : C.gold, color: '#0D0B08', border: 'none', padding: 14, borderRadius: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, cursor: (saving || success) ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 250ms' }}>
                {saving ? <><Loader2 size={13} className="animate-spin" /> Publishing…</> : success ? <><CheckCircle size={13} /> Published!</> : 'Publish Event →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
