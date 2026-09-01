'use client';
import { C } from '@/lib/theme';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Link2, Loader2, CheckCircle, AlertCircle, ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import Nav from '@/components/layout/Nav';
import LocationFields from '@/components/organizer/LocationFields';
import LineupPicker, { lineupPayload, emptyLineup, type LineupValue } from '@/components/organizer/LineupPicker';
import { detectArtistsFromText } from '@/lib/data/artists';
import { matchPlace } from '@/lib/places';

const CITIES = ['accra','kumasi','cape-coast','tamale','takoradi','ho','melbourne','sydney','london','international'];
const CITY_LABELS: Record<string,string> = {
  accra:'Accra', kumasi:'Kumasi', 'cape-coast':'Cape Coast', tamale:'Tamale',
  takoradi:'Takoradi', ho:'Ho', melbourne:'Melbourne', sydney:'Sydney',
  london:'London', international:'International',
};
const REGIONS: Record<string,string> = {
  accra:'Greater Accra', kumasi:'Ashanti', 'cape-coast':'Central',
  tamale:'Northern', takoradi:'Western', ho:'Volta',
  melbourne:'Australia', sydney:'Australia', london:'United Kingdom',
  international:'International',
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: C.bg3, border: `1px solid ${C.bd}`,
  borderRadius: 8, padding: '12px 14px',
  fontFamily: 'var(--font-inter), sans-serif', fontSize: 14,
  color: C.cream, outline: 'none',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'var(--font-dm-mono), monospace', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function FromLinkPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [url, setUrl] = useState('https://www.instagram.com/p/DcajY5Ogqu5/');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(0);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('international');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('20:00');
  const [imageUrl, setImageUrl] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [ticketSource, setTicketSource] = useState('Instagram');
  const [sourceUrl, setSourceUrl] = useState('');
  const [category, setCategory] = useState('concert');
  const [area, setArea] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [lineupVal, setLineupVal] = useState<LineupValue>(emptyLineup());

  async function parse() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/events/from-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not read link');
      const d = json.draft;
      setTitle(d.title);
      setDescription(d.description);
      setCity(d.city || 'international');
      setVenue(d.venue);
      setDate(d.date);
      setTime(d.time || '20:00');
      setImageUrl(d.imageUrl);
      setTicketUrl(d.ticketUrl);
      setTicketSource(d.ticketSource);
      setSourceUrl(d.sourceUrl);
      setCategory(d.category || 'concert');
      setNotes(d.notes || []);
      setConfidence(d.confidence || 0);
      // Prefer parser detection; fall back to scanning title/description
      const detected = (d.artistSlugs?.length || d.lineup?.length)
        ? { artistSlugs: d.artistSlugs || [], lineup: d.lineup || [] }
        : detectArtistsFromText(d.title, d.description);
      // Only open lineup UI when something was detected; house parties stay on "No lineup"
      if (detected.artistSlugs?.length || detected.lineup?.length) {
        setLineupVal({
          enabled: true,
          artistSlugs: detected.artistSlugs || [],
          extraNames: '',
        });
      } else {
        setLineupVal(emptyLineup());
      }
      const pin = matchPlace(`${d.venue || ''} ${d.city || ''}`, d.city);
      if (pin) {
        setArea(pin.area);
        setLat(pin.lat);
        setLng(pin.lng);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function slugify(t: string) {
    return t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 50)
      + '-' + Math.random().toString(36).slice(2, 7);
  }

  function dateLabel(d: string) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  async function publish(status: 'draft' | 'published') {
    if (!user) { window.location.href = '/auth'; return; }
    if (!title || !date || !venue || !ticketUrl) {
      setError('Title, date, venue and official ticket URL are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const bill = lineupPayload(lineupVal);
      const { error: evErr } = await supabase.from('events').insert({
        organizer_id: user.id,
        title: title.trim(),
        slug: slugify(title),
        description: description.trim(),
        category,
        city,
        region: REGIONS[city] ?? city,
        venue: venue.trim(),
        date,
        date_label: dateLabel(date),
        time,
        image_url: imageUrl.trim() || null,
        status,
        listing_type: 'listed',
        ticket_url: ticketUrl.trim(),
        ticket_source: ticketSource.trim(),
        source_url: sourceUrl.trim() || url,
        area: area.trim() || null,
        lat: lat ?? null,
        lng: lng ?? null,
        artist_slugs: bill.artist_slugs,
        lineup: bill.lineup,
      });
      if (evErr) throw evErr;
      router.push('/organizer/dashboard');
    } catch (e: any) {
      setError(e.message ?? 'Could not save. Run the SQL for listing_type columns first.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <Nav active="Events" />
      <div style={{ paddingTop: 62, maxWidth: 680, margin: '0 auto', padding: '80px 20px 80px' }}>
        <Link href="/organizer/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-dm-mono), monospace', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3, textDecoration: 'none', marginBottom: 20 }}>
          <ArrowLeft size={12} /> Dashboard
        </Link>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 32, fontWeight: 300, color: C.cream, letterSpacing: '-1px', marginBottom: 8 }}>
          Add from link
        </h1>
        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 14, fontWeight: 300, color: C.c2, lineHeight: 1.6, marginBottom: 28 }}>
          Paste an Instagram, X, Eventbrite or ticket URL. We draft the event — you confirm venue and the official buy link. Tickets stay on their site.
        </p>

        <div style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <Field label="Post or ticket URL">
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.instagram.com/p/…" style={{ ...inputStyle, flex: 1 }} />
              <button onClick={parse} disabled={loading || !url}
                style={{ background: C.gold, color: C.onAccent, border: 'none', padding: '0 18px', borderRadius: 8, fontFamily: 'var(--font-dm-mono), monospace', fontSize: 8, letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                {loading ? <Loader2 size={14} /> : <Link2 size={14} />}
                {loading ? 'Reading…' : 'Read'}
              </button>
            </div>
          </Field>
        </div>

        {confidence > 0 && (
          <p style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: 8, letterSpacing: '1.5px', textTransform: 'uppercase', color: confidence > 0.7 ? C.greenL : C.gold, marginBottom: 12 }}>
            Confidence {Math.round(confidence * 100)}% — review before publishing
          </p>
        )}

        {notes.length > 0 && (
          <div style={{ background: C.goldDim, border: `1px solid ${C.goldBd}`, borderRadius: 10, padding: 14, marginBottom: 20 }}>
            {notes.map(n => (
              <p key={n} style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, color: C.cream, marginBottom: 6 }}>{n}</p>
            ))}
          </div>
        )}

        {title !== '' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {imageUrl && <div style={{ height: 180, borderRadius: 12, backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', border: `1px solid ${C.bd}` }} />}
            <Field label="Title *">
              <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Description">
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="City *">
                <select value={city} onChange={e => setCity(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {CITIES.map(c => <option key={c} value={c}>{CITY_LABELS[c]}</option>)}
                </select>
              </Field>
              <Field label="Category">
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {['concert','festival','culture','nightlife'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Venue *">
              <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Prince Bandroom, Melbourne" style={inputStyle} />
            </Field>
            <Field label="Lineup / billed artists">
              <LineupPicker value={lineupVal} onChange={setLineupVal} />
            </Field>
            <LocationFields
              city={city}
              venue={venue}
              area={area}
              lat={lat}
              lng={lng}
              onChange={({ area: a, lat: la, lng: ln }) => { setArea(a); setLat(la); setLng(ln); }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Date *">
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Time">
                <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <Field label="Official ticket URL *">
              <input value={ticketUrl} onChange={e => setTicketUrl(e.target.value)} placeholder="https://… (not the Instagram post if you have the real shop)" style={inputStyle} />
            </Field>
            <Field label="Ticket source label">
              <input value={ticketSource} onChange={e => setTicketSource(e.target.value)} placeholder="Eventbrite, O2, Instagram" style={inputStyle} />
            </Field>

            {error && (
              <div style={{ display: 'flex', gap: 8, background: 'rgba(206,17,38,0.1)', border: '1px solid rgba(206,17,38,0.25)', borderRadius: 8, padding: 12 }}>
                <AlertCircle size={14} style={{ color: C.red }} />
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 12, color: '#f87171' }}>{error}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => publish('draft')} disabled={saving} style={{ flex: 1, background: 'transparent', color: C.c2, border: `1px solid ${C.bd}`, padding: 14, borderRadius: 8, fontFamily: 'var(--font-dm-mono), monospace', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>
                Save draft
              </button>
              <button onClick={() => publish('published')} disabled={saving} style={{ flex: 2, background: C.gold, color: C.onAccent, border: 'none', padding: 14, borderRadius: 8, fontFamily: 'var(--font-dm-mono), monospace', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {saving ? <Loader2 size={14} /> : <ExternalLink size={14} />}
                Publish as listed
              </button>
            </div>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 12, color: C.c3, textAlign: 'center' }}>
              Checkout stays off. The button on the event page opens the official ticket URL.
            </p>
          </div>
        )}
      </div>
    </div>
  );
        }
