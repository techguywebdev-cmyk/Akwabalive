'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Link2, Loader2, AlertCircle, ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import Nav from '@/components/layout/Nav';
import { T, FONT, GROUND } from '@/lib/thiscene';
import { BTN } from '@/components/events/CardParts';
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
  width: '100%', boxSizing: 'border-box', height: 52, padding: '0 16px', borderRadius: 16,
  background: 'rgba(255,255,255,0.06)', border: 'none',
  fontFamily: FONT.sans, fontSize: 16, color: T.white, outline: 'none',
};
const card: React.CSSProperties = { padding: 18, borderRadius: 22, background: T.surface, border: 'none' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: T.text2, margin: '0 0 8px 4px' }}>
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

  const [url, setUrl] = useState('');
  // /organizer/events/from-link?url=… (from a campus lead on the review page)
  useEffect(() => { const u = new URLSearchParams(window.location.search).get('url'); if (u) setUrl(u); }, []);
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

  async function publish(status: 'draft' | 'published' | 'pending_review') {
    if (!user) { window.location.href = `/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`; return; }
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
      router.push(status === 'pending_review' ? '/organizer/review' : '/organizer/dashboard');
    } catch (e: any) {
      setError(e.message ?? 'Could not save. Run the SQL for listing_type columns first.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav back="/organizer/dashboard" />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: 'calc(76px + env(safe-area-inset-top, 0px)) 20px 80px' }}>
        <Link href="/organizer/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 14, color: T.text2, textDecoration: 'none', marginBottom: 14 }}>
          <ArrowLeft size={15} /> Dashboard
        </Link>
        <h1 style={{ margin: '0 0 8px', fontFamily: FONT.display, fontSize: 32, fontWeight: 800, letterSpacing: '-0.035em', color: T.white }}>Add from a link</h1>
        <p style={{ margin: '0 0 22px', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.55, color: T.text2 }}>
          Paste an Instagram, X, Eventbrite or ticket link. We draft the event; you check the venue and the official ticket link. Tickets stay on their site.
        </p>

        <div style={{ ...card, marginBottom: 18 }}>
          <Field label="Post or ticket link">
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.instagram.com/p/…" inputMode="url" style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
              <button type="button" onClick={parse} disabled={loading || !url} style={{ ...BTN.primary, height: 52, padding: '0 18px', opacity: !url ? 0.5 : 1 }}>
                {loading ? <Loader2 size={16} /> : <Link2 size={16} />}
                {loading ? 'Reading…' : 'Read'}
              </button>
            </div>
          </Field>
        </div>

        {confidence > 0 && (
          <p style={{ margin: '0 0 12px', fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: confidence > 0.7 ? T.mintText : '#FFD98A' }}>
            {Math.round(confidence * 100)}% sure: check everything before publishing
          </p>
        )}

        {notes.length > 0 && (
          <div style={{ ...card, marginBottom: 18, background: 'rgba(123,227,168,0.08)' }}>
            {notes.map(n => <p key={n} style={{ margin: '0 0 6px', fontFamily: FONT.sans, fontSize: 14, color: T.text }}>{n}</p>)}
          </div>
        )}

        {title !== '' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {imageUrl && <img src={imageUrl} alt="" style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 18, display: 'block' }} />}
            <Field label="Event name *">
              <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Description">
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} style={{ ...inputStyle, height: 'auto', padding: '14px 16px', lineHeight: 1.5, resize: 'vertical' }} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="City *">
                <select value={city} onChange={e => setCity(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {CITIES.map(c => <option key={c} value={c}>{CITY_LABELS[c]}</option>)}
                </select>
              </Field>
              <Field label="Category">
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {[['concert', 'Concert'], ['festival', 'Festival'], ['nightlife', 'Nightlife'], ['culture', 'Culture'], ['food', 'Food & drink'], ['fashion', 'Fashion'], ['art', 'Art'], ['sports', 'Sports'], ['tech', 'Tech']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Venue *">
              <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g. Kona, Osu" style={inputStyle} />
            </Field>
            <Field label="Line-up">
              <LineupPicker value={lineupVal} onChange={setLineupVal} />
            </Field>
            <LocationFields city={city} venue={venue} area={area} lat={lat} lng={lng}
              onChange={({ area: a, lat: la, lng: ln }) => { setArea(a); setLat(la); setLng(ln); }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Date *"><input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} /></Field>
              <Field label="Time"><input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} /></Field>
            </div>
            <Field label="Official ticket link *">
              <input value={ticketUrl} onChange={e => setTicketUrl(e.target.value)} placeholder="https://… the real ticket shop, not the post" inputMode="url" style={inputStyle} />
            </Field>
            <Field label="Ticket site name">
              <input value={ticketSource} onChange={e => setTicketSource(e.target.value)} placeholder="e.g. Egotickets" style={inputStyle} />
            </Field>

            {error && (
              <div role="alert" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 16, background: 'rgba(255,138,138,0.1)', border: 'none'}}>
                <AlertCircle size={16} style={{ color: T.danger, flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 14, color: T.danger }}>{error}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => publish('draft')} disabled={saving} style={{ ...BTN.secondary, flex: 1 }}>Save draft</button>
              <button type="button" onClick={() => publish('pending_review')} disabled={saving} style={{ ...BTN.secondary, flex: 1 }}>For review</button>
              <button type="button" onClick={() => publish('published')} disabled={saving} style={{ ...BTN.primary, flex: '1 1 100%' }}>
                {saving ? <Loader2 size={16} /> : <ExternalLink size={16} />} Publish
              </button>
            </div>
            <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 13, color: T.text3, textAlign: 'center' }}>
              The ticket button on the event opens the official ticket link.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
