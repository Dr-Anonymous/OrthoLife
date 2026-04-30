/**
 * Converts any image URL to a properly-encoded PNG data URI via canvas.
 *
 * react-pdf's internal decoder struggles with indexed-color PNGs (4-bit/8-bit
 * palettes) and SVGs with <text> elements, producing doubled or garbled output.
 * Drawing through canvas re-encodes to 32-bit RGBA PNG at a PDF-sensible
 * resolution (max 600px wide), which react-pdf handles correctly.
 * 
 * react-pdf's image decoder doesn't handle indexed PNGs reliably 
 * — this is what's causing the doubled render. The getLogoAsPng canvas conversion we started is still the right fix 
 * — it re-encodes to 32-bit RGBA. Let me update the utility to also resize (3100×700 → manageable)
 */
export async function getLogoAsPng(url: string): Promise<string> {
  if (!url) return '';
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const MAX_W = 600;
        const scale = Math.min(1, MAX_W / (img.naturalWidth || MAX_W));
        const w = Math.round((img.naturalWidth || MAX_W) * scale);
        const h = Math.round((img.naturalHeight || 200) * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(url); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(url);
      }
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}
