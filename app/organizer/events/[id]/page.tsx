'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, Loader2,
  Calendar, MapPin, Clock, Tag, Image as ImageIcon,
  CheckCircle, AlertCircle, Save,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import Nav from '@/components/layout/Nav';

const C = {
  bg: '#0D0B08', bg2: '#141109', bg3: '#1C1710',
  gold: '#C8922A', goldDim: 'rgba(200,146,42,0.14)', goldBd: 'rgba(200,146,42,0.28)',
  cream: '#F5ECD7', c2: 'rgba(245,236,215,0.55)', c3: 'rgba(245,236,215,0.24)',
  c4: 'rgba(245,236,215,0.08)', bd: 'rgba(245,236,215,0.07)',
  red: '#CE1126', greenL: '#4ade80', greenDim: 'rgba(45,106,79,0.15)', greenBd: 'rgba(45,106,79,0.35)',
};

const CATEGORIES = ['festival','concert','food','nightlife','culture','sports','tech','art','fashion','wellness'];
const CITIES = ['accra','kumasi','cape-coast','tamale','takoradi','ho'];
const CITY_LABELS: Record<string,string> = {
  'accra':'Accra','kumasi':'Kumasi','cape-coast':'Cape Coast',
  'tamale':'Tamale','takoradi':'Takoradi','ho':'Ho',
};
const REGIONS: Record<string,string> = {
  'accra':'Greater Accra','kumasi':'Ashanti','cape-coast':'Central',
  'tamale':'Northern','takoradi':'Western','ho':'Volta',
};

interface Tier {
  id?: string;
  name: string;
  description: string;
  price: string;
  quantity: string;
  sold: number;
}

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

export default function EditEventPage() {
  const params   = useParams();
  const router   = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const id       = params.id as string;

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState('');
  const [notFound, setNotFound] = useState(false);

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState('');
  const [city,        setCity]        = useState('');
  const [venue,       setVenue]       = useState('');
  const [date,        setDate]        = useState('');
  const [time,        setTime]        = useState('');
  const [endTime,     setEndTime]     = useState('');
  const [imageUrl,    setImageUrl]    = useState('');
  const [status,      setStatus]      = useState('draft');
  const [tiers,       setTiers]       = useState<Tier[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { window.location.href = '/auth'; return; }
    loadEvent();
  }, [user, authLoading, id]);

  async function loadEvent() {
    const { data } = await supabase
      .from('events')
      .select('*, ticket_tiers(*)')
      .eq('id', id)
      .eq('organizer_id', user!.id)
      .single();

    if (!data) { setNotFound(true); setLoading(false); return; }

    setTitle(data.title ?? '');
    setDescription(data.description ?? '');
    setCategory(data.category ?? '');
    setCity(data.city ?? '');
    setVenue(data.venue ?? '');
    setDate(data.date ?? '');
    setTime(data.time ?? '');
    setEndTime(data.end_time ?? '');
    setImageUrl(data.image_url ?? '');
    setStatus(data.status ?? 'draft');
    setTiers((data.ticket_tiers ?? []).map((t: any) => ({
      id:          t.id,
      name:        t.name,
      description: t.description ?? '',
      price:       String(t.price),
      quantity:    String(t.quantity),
      sold:        t.sold ?? 0,
    })));
    setLoading(false);
  }

  function addTier() {
    setTiers(t => [...t, { name: '', description: '', price: '0', quantity: '50', sold: 0 }]);
  }

  function removeTier(i: number) {
    setTiers(t => t.filter((_, idx) => idx !== i));
  }

  function updateTier(i: number, field: keyof Tier, value: string) {
    setTiers(t => t.map((tier, idx) => idx === i ? { ...tier, [field]: value } : tier));
  }

  function formatDateLabel(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  async function handleSave() {
    setError('');
    setSaving(true);

    try {
      // Update event
      const { error: eventError } = await supabase
        .from('events')
        .update({
          title:       title.trim(),
          description: description.trim(),
          category,
          city,
          region:      REGIONS[city] ?? city,
          venue:       venue.trim(),
          date,
          date_label:  formatDateLabel(date),
          time,
          end_time:    endTime,
          image_url:   imageUrl.trim() || null,
          updated_at:  new Date().toISOString(),
        })
        .eq('id', id);

      if (eventError) throw eventError;

      // Delete existing tiers and re-insert
      await supabase.from('ticket_tiers').delete().eq('event_id', id);

      const tierRows = tiers
        .filter(t => t.name.trim())
        .map(t => ({
          event_id:    id,
          name:        t.name.trim(),
          description: t.description.trim(),
          price:       parseFloat(t.price) || 0,
          quantity:    parseInt(t.quantity) || 50,
          sold:        t.sold,
        }));

      if (tierRows.length > 0) {
        const { error: tierError } = await supabase.from('ticket_tiers').insert(tierRows);
        if (tierError) throw tierError;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

    } catch (err: any) {
      setError(err.message ?? 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <Nav active="Events" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3 }}>Loading…</p>
      </div>
    </div>
  );

  if (notFound) return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <Nav active="Events" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
        <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 24, color: C.c2 }}>Event not found</p>
        <Link href="/organizer/dashboard" style={{ color: C.gold, textDecoration: 'none', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', border: `1px solid ${C.goldBd}`, padding: '10px 20px', borderRadius: 6 }}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <Nav active="Events" />
      <div style={{ paddingTop: 62, maxWidth: 680, margin: '0 auto', padding: '80px 20px 80px' }}>

        <div style={{ marginBottom: 28 }}>
          <Link href="/organizer/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3, textDecoration: 'none', marginBottom: 20 }}>
            <ArrowLeft size={12} /> Dashboard
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 28, fontWeight: 300, color: C.cream, letterSpacing: '-0.5px' }}>
              Edit Event
            </h1>
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 4, background: status === 'published' ? C.greenDim : C.c4, color: status === 'published' ? C.greenL : C.c3, border: `1px solid ${status === 'published' ? C.greenBd : C.bd}` }}>
              {status === 'published' ? '● Live' : '○ Draft'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Basic Info */}
          <div style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 14, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag size={11} /> Basic Information
            </p>
            <Input label="Event Title *">
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
            </Input>
            <Input label="Description">
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
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
              <input type="text" value={venue} onChange={e => setVenue(e.target.value)} style={inputStyle} />
            </Input>
          </div>

          {/* Date & Time */}
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

          {/* Cover Image */}
          <div style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 14, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ImageIcon size={11} /> Cover Image
            </p>
            <Input label="Image URL">
              <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/…" style={inputStyle} />
            </Input>
            {imageUrl && (
              <div style={{ height: 160, borderRadius: 8, overflow: 'hidden', backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', border: `1px solid ${C.bd}` }} />
            )}
          </div>

          {/* Ticket Tiers */}
          <div style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 14, padding: '24px 20px' }}>
            <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Tag size={11} /> Ticket Tiers
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {tiers.map((tier, i) => (
                <div key={i} style={{ background: C.bg3, border: `1px solid ${C.bd}`, borderRadius: 10, padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c3 }}>Tier {i + 1}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {tier.sold > 0 && (
                        <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, color: C.greenL }}>{tier.sold} sold</span>
                      )}
                      {tiers.length > 1 && tier.sold === 0 && (
                        <button onClick={() => removeTier(i)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1px', textTransform: 'uppercase', border: '1px solid rgba(206,17,38,0.2)', background: 'transparent', color: 'rgba(206,17,38,0.6)', padding: '5px 9px', borderRadius: 4, cursor: 'pointer' }}>
                          <Trash2 size={10} /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <Input label="Name *">
                      <input type="text" value={tier.name} onChange={e => updateTier(i, 'name', e.target.value)} style={inputStyle} />
                    </Input>
                    <Input label="Description">
                      <input type="text" value={tier.description} onChange={e => updateTier(i, 'description', e.target.value)} style={inputStyle} />
                    </Input>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Input label="Price (₵)">
                        <input type="number" value={tier.price} onChange={e => updateTier(i, 'price', e.target.value)} min="0" style={inputStyle} />
                      </Input>
                      <Input label="Quantity *">
                        <input type="number" value={tier.quantity} onChange={e => updateTier(i, 'quantity', e.target.value)} min={String(tier.sold)} style={inputStyle} />
                      </Input>
                    </div>
                  </div>
                </div>
              ))}
              {tiers.length < 4 && (
                <button onClick={addTier}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: `1px dashed ${C.bd}`, background: 'transparent', color: C.c3, padding: '12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', width: '100%' }}>
                  <Plus size={12} /> Add Tier
                </button>
              )}
            </div>
          </div>

          {/* Feedback */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(206,17,38,0.1)', border: '1px solid rgba(206,17,38,0.25)', borderRadius: 8, padding: '12px 14px' }}>
              <AlertCircle size={14} style={{ color: C.red, flexShrink: 0 }} />
              <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: '#f87171' }}>{error}</p>
            </div>
          )}
          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.greenDim, border: `1px solid ${C.greenBd}`, borderRadius: 8, padding: '12px 14px' }}>
              <CheckCircle size={14} style={{ color: C.greenL, flexShrink: 0 }} />
              <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.greenL }}>Changes saved successfully</p>
            </div>
          )}

          {/* Save button */}
          <button onClick={handleSave} disabled={saving}
            style={{ width: '100%', background: saving ? C.bg3 : C.gold, color: saving ? C.c3 : '#0D0B08', border: `1px solid ${saving ? C.bd : C.gold}`, padding: 15, borderRadius: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 200ms' }}>
            {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}
