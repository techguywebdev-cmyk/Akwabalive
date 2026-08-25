/**
 * Read text from a flyer image via OCR.space (free tier).
 * Set OCR_SPACE_API_KEY in Vercel env (get one at https://ocr.space/ocrapi).
 * Falls back to the public demo key (rate-limited) if unset.
 */

export type OcrResult = {
  text: string;
  used: boolean;
  error?: string;
};

export async function ocrFlyerImage(imageUrl: string): Promise<OcrResult> {
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    return { text: '', used: false, error: 'No image URL' };
  }

  const apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld';

  try {
    const body = new URLSearchParams({
      url: imageUrl,
      language: 'eng',
      isOverlayRequired: 'false',
      scale: 'true',
      OCREngine: '2',
    });

    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!res.ok) {
      return { text: '', used: false, error: `OCR HTTP ${res.status}` };
    }

    const data = await res.json();
    if (data.IsErroredOnProcessing) {
      const msg = Array.isArray(data.ErrorMessage)
        ? data.ErrorMessage.join('; ')
        : data.ErrorMessage || data.ErrorMessageDetails || 'OCR failed';
      return { text: '', used: false, error: String(msg) };
    }

    const parts: string[] = (data.ParsedResults || [])
      .map((p: { ParsedText?: string }) => p.ParsedText || '')
      .filter(Boolean);

    const text = parts.join('\n').replace(/\r/g, '').trim();
    return { text, used: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'OCR request failed';
    return { text: '', used: false, error: msg };
  }
}
