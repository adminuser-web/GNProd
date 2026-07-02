import React, { useState, useEffect } from 'react';
import { useContentContext } from '../../../context/ContentContext';
import { contentService } from '../../../features/content/services/contentService';
import { SiteContentMap, DEFAULT_SITE_CONTENT } from '../../../types';
import { Save, AlertCircle, RefreshCw, Upload } from 'lucide-react';
import { GoldButton } from '../../GoldButton';

import { ImageUpload } from '../ImageUpload';
import { UploadSpecKey } from '../../../config/uploadSpecs';
import { previewLink } from '../../../lib/maintenance';
import { toast } from 'sonner';

// Friendly section metadata for the sidebar + header.
const AREA_META: Record<string, { label: string; desc: string }> = {
  brand: { label: 'Brand & Identity', desc: 'Logo, favicon, name, contact, store & social links.' },
  home: { label: 'Homepage', desc: 'Hero, featured and homepage sections.' },
  philosophy: { label: 'Philosophy', desc: 'The about / philosophy page copy.' },
  contact: { label: 'Contact', desc: 'Contact page intro and FAQs.' },
  footer: { label: 'Footer', desc: 'Footer columns and copyright.' },
  legal: { label: 'Legal', desc: 'Privacy, terms and returns.' },
  seo: { label: 'SEO & Social', desc: 'Browser tab title, description and share image.' },
  reviews: { label: 'Reviews', desc: 'Customer reviews shown on the site.' },
  maintenance: { label: 'Site Status', desc: 'Launching-soon / maintenance mode and preview access.' },
};

function Field({ label, help, value, onChange, type = 'text', textarea = false }: any) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-content/70 mb-1.5">{label}</label>
      {textarea ? (
        <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={3}
          className="w-full bg-bg border border-line px-3 py-2 text-sm text-content focus:outline-none focus:border-[#c5a059] transition-colors" />
      ) : (
        <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
          className="w-full bg-bg border border-line px-3 py-2 text-sm text-content focus:outline-none focus:border-[#c5a059] transition-colors" />
      )}
      {help && <p className="text-[10px] text-muted mt-1 leading-relaxed">{help}</p>}
    </div>
  );
}

function Card({ title, desc, children }: any) {
  return (
    <div className="bg-bg/40 border border-line p-5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-[#c5a059]">{title}</h3>
      {desc && <p className="text-[10px] text-muted mt-1">{desc}</p>}
      <div className="space-y-4 mt-4">{children}</div>
    </div>
  );
}

function BrandIdentityForm({ data, onChange }: { data: any; onChange: (path: string[], value: any) => void }) {
  const d = data || {};
  return (
    <div className="space-y-6">
      <Card title="Identity" desc="Store name, tagline, logo and browser icon.">
        <Field label="Brand Name" value={d.brandName} onChange={(v: string) => onChange(['brandName'], v)} help="Used in the browser tab, and in the header when no logo is set." />
        <Field label="Tagline" value={d.tagline} onChange={(v: string) => onChange(['tagline'], v)} />
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-content/70 mb-1.5">Logo</label>
          <p className="text-[10px] text-muted mb-2">Shown in the site header (falls back to the text wordmark if empty). Transparent PNG recommended.</p>
          <ImageUpload specKey="brandLogo" value={d.logoUrl} onChange={(v) => onChange(['logoUrl'], v)} storagePath="content/brand/logo" />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-content/70 mb-1.5">Favicon</label>
          <p className="text-[10px] text-muted mb-2">The small icon in the browser tab. Square image (e.g. 64×64) — PNG, SVG or ICO.</p>
          <ImageUpload specKey="brandLogo" supportThemes={false} value={d.faviconUrl} onChange={(v) => onChange(['faviconUrl'], v)} storagePath="content/brand/favicon" />
        </div>
      </Card>

      <Card title="Contact" desc="Used in the footer, contact page and WhatsApp links.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Phone" value={d.contact?.phone} onChange={(v: string) => onChange(['contact', 'phone'], v)} />
          <Field label="WhatsApp" value={d.contact?.whatsapp} onChange={(v: string) => onChange(['contact', 'whatsapp'], v)} />
          <Field label="Email" value={d.contact?.email} onChange={(v: string) => onChange(['contact', 'email'], v)} />
          <Field label="Instagram URL" value={d.contact?.instagram} onChange={(v: string) => onChange(['contact', 'instagram'], v)} />
        </div>
      </Card>

      <Card title="Store" desc="Your physical store details (shown on Contact & Locate Us).">
        <Field label="Address" textarea value={d.store?.address} onChange={(v: string) => onChange(['store', 'address'], v)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Hours" value={d.store?.hours} onChange={(v: string) => onChange(['store', 'hours'], v)} />
          <Field label="Google Maps Link" value={d.store?.mapLink} onChange={(v: string) => onChange(['store', 'mapLink'], v)} />
        </div>
      </Card>

      <Card title="Social" desc="Social profile handles or URLs.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Instagram" value={d.social?.instagram} onChange={(v: string) => onChange(['social', 'instagram'], v)} />
          <Field label="Facebook" value={d.social?.facebook} onChange={(v: string) => onChange(['social', 'facebook'], v)} />
          <Field label="YouTube" value={d.social?.youtube} onChange={(v: string) => onChange(['social', 'youtube'], v)} />
        </div>
      </Card>

      <Card title="Order Emails" desc="Payment, confirmation, and status emails are sent automatically to customers. This address is only used for any manual one-off emails you send from the admin order page (opens a pre-filled Gmail draft).">
        <Field label="Order email sent from (Gmail address)" value={d.orderEmailFrom} onChange={(v: string) => onChange(['orderEmailFrom'], v)} help="e.g. adminuser@grainood.com — Gmail opens this account even if several are signed in." />
      </Card>
    </div>
  );
}

function HomeForm({ data, onChange }: { data: any; onChange: (path: string[], value: any) => void }) {
  const d = data || {};
  const hero = d.hero || {};
  return (
    <div className="space-y-6">
      <Card title="Hero" desc="The main banner at the top of the homepage.">
        <Field label="Headline" value={hero.headline} onChange={(v: string) => onChange(['hero', 'headline'], v)} />
        <Field label="Subheadline" textarea value={hero.subheadline} onChange={(v: string) => onChange(['hero', 'subheadline'], v)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Primary Button Label" value={hero.primaryCtaLabel} onChange={(v: string) => onChange(['hero', 'primaryCtaLabel'], v)} />
          <Field label="Primary Button Link" value={hero.primaryCtaLink} onChange={(v: string) => onChange(['hero', 'primaryCtaLink'], v)} />
          <Field label="Secondary Button Label" value={hero.secondaryCtaLabel} onChange={(v: string) => onChange(['hero', 'secondaryCtaLabel'], v)} />
          <Field label="Secondary Button Link" value={hero.secondaryCtaLink} onChange={(v: string) => onChange(['hero', 'secondaryCtaLink'], v)} />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-content/70 mb-1.5">Background Image</label>
          <p className="text-[10px] text-muted mb-2">Shown behind the hero. 1600×900 recommended.</p>
          <ImageUpload specKey="heroImage" value={hero.bgImageUrl} onChange={(v) => onChange(['hero', 'bgImageUrl'], v)} storagePath="content/home/hero" />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-content/70 mb-1.5">Background Video (optional)</label>
          <p className="text-[10px] text-muted mb-2">Plays behind the hero on desktop; overrides the image when set. MP4 recommended.</p>
          <ImageUpload specKey="heroVideo" supportThemes={false} value={hero.videoUrl} onChange={(v) => onChange(['hero', 'videoUrl'], v)} storagePath="content/home/hero-video" />
        </div>
      </Card>
      <Card title="Featured Section" desc="Intro shown above the series on the homepage.">
        <Field label="Heading" value={d.featured?.heading} onChange={(v: string) => onChange(['featured', 'heading'], v)} />
        <Field label="Copy" textarea value={d.featured?.copy} onChange={(v: string) => onChange(['featured', 'copy'], v)} />
      </Card>
    </div>
  );
}

function SeoForm({ data, onChange }: { data: any; onChange: (path: string[], value: any) => void }) {
  const d = data || {};
  return (
    <div className="space-y-6">
      <Card title="Search & Social" desc="How your site appears in browser tabs, search results and shared links.">
        <Field label="Page Title" value={d.defaultTitle} onChange={(v: string) => onChange(['defaultTitle'], v)} help="Shown in the browser tab and search results." />
        <Field label="Meta Description" textarea value={d.defaultDescription} onChange={(v: string) => onChange(['defaultDescription'], v)} help="~150 characters, shown under the title in search results." />
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-content/70 mb-1.5">Default Share Image</label>
          <p className="text-[10px] text-muted mb-2">Used when your site is shared on social media. 1200×630 recommended.</p>
          <ImageUpload specKey="contentImage" value={d.defaultOgImage} onChange={(v) => onChange(['defaultOgImage'], v)} storagePath="content/seo" />
        </div>
      </Card>
    </div>
  );
}

function PhilosophyForm({ data, onChange }: { data: any; onChange: (path: string[], value: any) => void }) {
  const d = data || {};
  return (
    <div className="space-y-6">
      <Card title="Philosophy / About" desc="The about page heading and body copy.">
        <Field label="Heading" value={d.heading} onChange={(v: string) => onChange(['heading'], v)} />
        <Field label="Body" textarea value={d.copy} onChange={(v: string) => onChange(['copy'], v)} />
      </Card>
    </div>
  );
}

function ContactForm({ data, onChange }: { data: any; onChange: (path: string[], value: any) => void }) {
  const d = data || {};
  const faqs: any[] = d.faqs || [];
  const setFaqs = (next: any[]) => onChange(['faqs'], next);
  return (
    <div className="space-y-6">
      <Card title="Contact Page" desc="Intro shown at the top of the contact page.">
        <Field label="Heading" value={d.heading} onChange={(v: string) => onChange(['heading'], v)} />
        <Field label="Intro" textarea value={d.intro} onChange={(v: string) => onChange(['intro'], v)} />
      </Card>
      <Card title="FAQs" desc="Questions and answers shown on the contact page.">
        {faqs.map((f, i) => (
          <div key={i} className="relative border border-line p-3 space-y-3">
            <button type="button" onClick={() => setFaqs(faqs.filter((_, j) => j !== i))} className="absolute right-2 top-2 text-red-400 text-[10px] uppercase tracking-widest hover:text-red-300">Remove</button>
            <Field label={`Question ${i + 1}`} value={f.question} onChange={(v: string) => setFaqs(faqs.map((x, j) => (j === i ? { ...x, question: v } : x)))} />
            <Field label="Answer" textarea value={f.answer} onChange={(v: string) => setFaqs(faqs.map((x, j) => (j === i ? { ...x, answer: v } : x)))} />
          </div>
        ))}
        <button type="button" onClick={() => setFaqs([...faqs, { question: '', answer: '' }])} className="text-[#c5a059] text-[10px] font-bold uppercase tracking-widest hover:text-white">+ Add FAQ</button>
      </Card>
    </div>
  );
}

function FooterForm({ data, onChange }: { data: any; onChange: (path: string[], value: any) => void }) {
  const d = data || {};
  const columns: any[] = d.columns || [];
  const setColumns = (next: any[]) => onChange(['columns'], next);
  const updateCol = (i: number, patch: any) => setColumns(columns.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <div className="space-y-6">
      <Card title="Footer Columns" desc="Link columns shown in the site footer.">
        {columns.map((col, i) => {
          const links: any[] = col.links || [];
          const setLinks = (next: any[]) => updateCol(i, { links: next });
          return (
            <div key={i} className="relative border border-line p-3 space-y-3">
              <button type="button" onClick={() => setColumns(columns.filter((_, j) => j !== i))} className="absolute right-2 top-2 text-red-400 text-[10px] uppercase tracking-widest hover:text-red-300">Remove Column</button>
              <Field label="Column Title" value={col.title} onChange={(v: string) => updateCol(i, { title: v })} />
              {links.map((lnk, k) => (
                <div key={k} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <Field label="Label" value={lnk.label} onChange={(v: string) => setLinks(links.map((x, m) => (m === k ? { ...x, label: v } : x)))} />
                  <Field label="URL" value={lnk.url} onChange={(v: string) => setLinks(links.map((x, m) => (m === k ? { ...x, url: v } : x)))} />
                  <button type="button" onClick={() => setLinks(links.filter((_, m) => m !== k))} className="text-red-400 text-sm pb-2 px-1">×</button>
                </div>
              ))}
              <button type="button" onClick={() => setLinks([...links, { label: '', url: '' }])} className="text-[#c5a059] text-[10px] uppercase tracking-widest hover:text-white">+ Add Link</button>
            </div>
          );
        })}
        <button type="button" onClick={() => setColumns([...columns, { title: '', links: [] }])} className="text-[#c5a059] text-[10px] font-bold uppercase tracking-widest hover:text-white">+ Add Column</button>
      </Card>
      <Card title="Bottom Bar" desc="Copyright line at the very bottom (the year auto-updates).">
        <Field label="Copyright Text" value={d.bottomCopy} onChange={(v: string) => onChange(['bottomCopy'], v)} />
      </Card>
    </div>
  );
}

function LegalForm({ data, onChange }: { data: any; onChange: (path: string[], value: any) => void }) {
  const d = data || {};
  const sections: Array<[string, string]> = [['privacy', 'Privacy Policy'], ['terms', 'Terms of Service'], ['returns', 'Returns & Refunds']];
  return (
    <div className="space-y-6">
      {sections.map(([key, label]) => (
        <Card key={key} title={label}>
          <Field label="Title" value={d[key]?.title} onChange={(v: string) => onChange([key, 'title'], v)} />
          <Field label="Body" textarea value={d[key]?.body} onChange={(v: string) => onChange([key, 'body'], v)} />
        </Card>
      ))}
    </div>
  );
}

function ReviewsForm({ data, onChange }: { data: any; onChange: (path: string[], value: any) => void }) {
  const d = data || {};
  const reviews: any[] = d.reviews || [];
  const setReviews = (next: any[]) => onChange(['reviews'], next);
  const update = (i: number, patch: any) => setReviews(reviews.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-6">
      <Card title="Customer Reviews" desc="Testimonials shown on the site.">
        {reviews.map((r, i) => (
          <div key={i} className="relative border border-line p-3 space-y-3">
            <button type="button" onClick={() => setReviews(reviews.filter((_, j) => j !== i))} className="absolute right-2 top-2 text-red-400 text-[10px] uppercase tracking-widest hover:text-red-300">Remove</button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" value={r.name} onChange={(v: string) => update(i, { name: v })} />
              <Field label="Rating (1–5)" type="number" value={r.rating} onChange={(v: string) => update(i, { rating: Number(v) || 0 })} />
            </div>
            <Field label="Review" textarea value={r.text} onChange={(v: string) => update(i, { text: v })} />
            <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-content/70 cursor-pointer select-none">
              <input type="checkbox" checked={!!r.verified} onChange={(e) => update(i, { verified: e.target.checked })} className="accent-[#c5a059] w-3.5 h-3.5" />
              Verified purchase
            </label>
          </div>
        ))}
        <button type="button" onClick={() => setReviews([...reviews, { name: '', rating: 5, text: '', verified: false }])} className="text-[#c5a059] text-[10px] font-bold uppercase tracking-widest hover:text-white">+ Add Review</button>
      </Card>
    </div>
  );
}

function MaintenanceForm({ data, onChange }: { data: any; onChange: (path: string[], value: any) => void }) {
  const d = data || {};
  const enabled = d.enabled === true;
  const link = previewLink(d.bypassSecret || '');
  return (
    <div className="space-y-6">
      <Card title="Launching Soon Mode" desc="When ON, public visitors see a 'Launching Soon' splash. /admin and /login stay open; admins and preview-link holders still see the full site.">
        <label className="flex items-center justify-between gap-4 border border-line p-4 cursor-pointer select-none">
          <span>
            <span className={`block text-sm font-bold uppercase tracking-widest ${enabled ? 'text-amber-400' : 'text-emerald-400'}`}>{enabled ? 'Maintenance mode is ON' : 'Site is LIVE'}</span>
            <span className="block text-[10px] text-muted mt-1">{enabled ? 'The public sees the Launching Soon page.' : 'Everyone sees the full site.'}</span>
          </span>
          <input type="checkbox" checked={enabled} onChange={(e) => onChange(['enabled'], e.target.checked)} className="accent-[#c5a059] w-5 h-5 shrink-0" />
        </label>
        <Field label="Headline" value={d.headline} onChange={(v: string) => onChange(['headline'], v)} />
        <Field label="Subtext" textarea value={d.subtext} onChange={(v: string) => onChange(['subtext'], v)} />
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-content/70 mb-1.5">Hero image</label>
          <p className="text-[10px] text-muted mb-2">Shown glowing beside the headline. Use a bat product shot on a <strong>black or transparent</strong> background so it blends into the splash.</p>
          <ImageUpload specKey="heroImage" supportThemes={false} value={d.heroImage} onChange={(v) => onChange(['heroImage'], v)} storagePath="content/maintenance" />
        </div>
      </Card>

      <Card title="Preview Access" desc="Share this link so you or your team can browse the full site while it's hidden. Rotating the secret revokes previously-shared links.">
        <Field label="Bypass secret" value={d.bypassSecret} onChange={(v: string) => onChange(['bypassSecret'], v)} help="Used in the preview link. Change it to revoke old links." />
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-content/70 mb-1.5">Shareable preview link</label>
          <div className="flex gap-2">
            <input readOnly value={link} onFocus={(e) => e.target.select()} className="flex-1 bg-bg border border-line px-3 py-2 text-xs text-content/80 font-mono" />
            <button type="button" onClick={() => { navigator.clipboard?.writeText(link); toast.success('Preview link copied'); }} className="border border-[#c5a059]/40 text-[#c5a059] px-4 text-[10px] uppercase tracking-widest font-bold hover:bg-[#c5a059] hover:text-bg transition-colors">Copy</button>
          </div>
          <p className="text-[10px] text-muted mt-1.5 leading-relaxed">Opening this link unlocks the full site in that browser (remembered), even while Launching Soon is on. Save your changes first — the link uses the current secret.</p>
        </div>
      </Card>
    </div>
  );
}

const SECTION_FORMS: Record<string, React.ComponentType<{ data: any; onChange: (path: string[], value: any) => void }>> = {
  brand: BrandIdentityForm,
  home: HomeForm,
  seo: SeoForm,
  philosophy: PhilosophyForm,
  contact: ContactForm,
  footer: FooterForm,
  legal: LegalForm,
  reviews: ReviewsForm,
  maintenance: MaintenanceForm,
};

export function AdminContentEditorPage() {
  const { contentMap, refresh, loading: ctxLoading } = useContentContext();
  const [activeArea, setActiveArea] = useState<keyof SiteContentMap>('brand');
  const [editorData, setEditorData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!ctxLoading && contentMap) {
      setEditorData(contentMap[activeArea] || DEFAULT_SITE_CONTENT[activeArea]);
      setIsDirty(false);
    }
  }, [activeArea, contentMap, ctxLoading]);

  // Warn before a full page unload/refresh if there are unsaved edits.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Guard against silently discarding unsaved edits when switching sections.
  const handleAreaChange = (area: keyof SiteContentMap) => {
    if (area === activeArea) return;
    if (isDirty && !window.confirm('You have unsaved changes in this section. Discard them and switch?')) {
      return;
    }
    setActiveArea(area);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await contentService.updateArea(activeArea, editorData);
      await refresh();
      setIsDirty(false);
      setSuccess('Content updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      const code = String(err?.code || '');
      const msg = String(err?.message || '');
      if (code.includes('permission-denied') || /insufficient permissions/i.test(msg)) {
        setError('Save was blocked by the database security rules. This admin account is missing the required permissions, or the Firestore rules for this project have not been published yet. This is a backend setup step — it is not a problem with your edits.');
      } else if (code.includes('unauthenticated')) {
        setError('You appear to be signed out. Please sign in again and retry.');
      } else if (code.includes('unavailable') || /app check|appcheck/i.test(msg)) {
        setError('The request could not reach the database (App Check or network). Confirm App Check is configured for this domain, then retry.');
      } else {
        setError(msg || 'Failed to update content');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (path: string[], value: any) => {
    setIsDirty(true);
    setEditorData((prev: any) => {
      const draft = JSON.parse(JSON.stringify(prev));
      let current = draft;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return draft;
    });
  };

  if (ctxLoading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="animate-spin text-[#c5a059]" size={32} />
      </div>
    );
  }

  const renderField = (key: string, value: any, path: string[]) => {
    if (Array.isArray(value)) {
      return (
        <div key={key} className="mb-6 border border-line p-4">
          <label className="block text-xs font-bold text-content tracking-widest uppercase mb-4">{key}</label>
          {value.map((item, index) => (
            <div key={index} className="mb-4 pb-4 border-b border-line relative">
              <div className="absolute right-0 top-0">
                 <button onClick={() => {
                   const newArr = [...value];
                   newArr.splice(index, 1);
                   handleChange(path, newArr);
                 }} className="text-red-500 text-xs">Remove</button>
              </div>
              <h4 className="text-[10px] text-muted mb-2 uppercase">Item {index + 1}</h4>
              {typeof item === 'object' ? (
                Object.entries(item).map(([k, v]) => (
                  <div key={k} className="mt-2">
                     <label className="block text-[10px] text-content/70 tracking-widest uppercase mb-1">{k}</label>
                     {typeof v === 'string' && (v.length > 50 || k === 'body' || k === 'copy' || k === 'answer' || k === 'text') ? (
                       <textarea 
                        value={v as string}
                        onChange={(e) => {
                          const newArr = [...value];
                          newArr[index] = { ...item, [k]: e.target.value };
                          handleChange(path, newArr);
                        }}
                        className="w-full bg-surface border border-line px-3 py-2 text-sm focus:border-[#c5a059] focus:outline-none min-h-[100px]"
                       />
                     ) : (
                       <input 
                         type="text"
                         value={v as any}
                         onChange={(e) => {
                          const newArr = [...value];
                          newArr[index] = { ...item, [k]: e.target.value };
                          handleChange(path, newArr);
                         }}
                         className="w-full bg-surface border border-line px-3 py-2 text-sm focus:border-[#c5a059] focus:outline-none"
                       />
                     )}
                  </div>
                ))
              ) : (
                 <input 
                   type="text"
                   value={item}
                   onChange={(e) => {
                     const newArr = [...value];
                     newArr[index] = e.target.value;
                     handleChange(path, newArr);
                   }}
                   className="w-full bg-surface border border-line px-3 py-2 text-sm focus:border-[#c5a059] focus:outline-none"
                 />
              )}
            </div>
          ))}
          <button 
           onClick={() => {
             const newArr = [...value];
             if (value.length > 0) {
               if (typeof value[0] === 'object') {
                 const emptyObj: any = {};
                 Object.keys(value[0]).forEach(k => emptyObj[k] = '');
                 newArr.push(emptyObj);
               } else {
                 newArr.push('');
               }
             } else {
               newArr.push('');
             }
             handleChange(path, newArr);
           }}
           className="text-xs text-[#c5a059] hover:text-white uppercase tracking-widest mt-2"
          >
            + Add {key}
          </button>
        </div>
      );
    }
    
    if (typeof value === 'object' && value !== null) {
      return (
        <div key={key} className="mb-6 pl-4 border-l border-[#c5a059]/20">
          <label className="block text-xs font-bold text-[#c5a059] tracking-widest uppercase mb-4">{key}</label>
          {Object.entries(value).map(([subKey, subValue]) => renderField(subKey, subValue, [...path, subKey]))}
        </div>
      );
    }

    const isImageField = key.toLowerCase().includes('image') || key.toLowerCase().includes('pic') || key.toLowerCase().includes('bg');
    const isVideoField = key.toLowerCase().includes('video');
    const isMediaField = isImageField || isVideoField;

    return (
      <div key={key} className="mb-4">
        <label className="block text-[10px] text-content/70 tracking-widest uppercase mb-1">{key}</label>
        {isMediaField ? (
          <div className="flex flex-col gap-2">
            <ImageUpload
              specKey={isVideoField ? 'heroVideo' : (key.toLowerCase().includes('logo') ? 'brandLogo' : (key.toLowerCase().includes('hero') ? 'heroImage' : 'contentImage'))}
              value={value as any}
              supportThemes={!isVideoField}
              onChange={(url) => handleChange(path, url)}
              storagePath={`content/${activeArea}`}
            />
            <input
              type="text"
              placeholder="Or enter media URL manually"
              value={typeof value === 'string' ? value : ((value as any)?.light || '')}
              onChange={(e) => handleChange(path, e.target.value)}
              className="w-full bg-surface border border-line px-3 py-2 text-sm focus:border-[#c5a059] focus:outline-none font-mono tracking-widest text-[#c5a059] placeholder:text-muted/50"
            />
          </div>
        ) : typeof value === 'string' && (value.length > 50 || key === 'body' || key === 'copy' || key === 'address') ? (
          <textarea
            value={value as string}
            onChange={(e) => handleChange(path, e.target.value)}
            className="w-full bg-surface border border-line px-3 py-2 text-sm focus:border-[#c5a059] focus:outline-none min-h-[100px] font-mono whitespace-pre"
          />
        ) : (
          <input
            type={typeof value === 'number' ? 'number' : 'text'}
            value={value !== undefined ? value : ''}
            onChange={(e) => handleChange(path, typeof value === 'number' ? Number(e.target.value) : e.target.value)}
            className="w-full bg-surface border border-line px-3 py-2 text-sm focus:border-[#c5a059] focus:outline-none font-mono"
          />
        )}
      </div>
    );
  };

  const areas: (keyof SiteContentMap)[] = ['brand', 'home', 'philosophy', 'contact', 'footer', 'legal', 'seo', 'reviews', 'maintenance'];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="sticky top-0 z-sticky-section bg-bg flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mb-5 border-b border-line pt-2 pb-3">
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold tracking-wide text-content">
            <span className="text-muted font-normal text-sm">Content & System / </span>
            Site Content
          </h1>
          <p className="text-xs text-muted mt-1">Manage website copy and structure.</p>
        </div>
        <div className="flex items-center gap-4">
          {isDirty && (
            <span className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Unsaved changes
            </span>
          )}
          <GoldButton onClick={handleSave} disabled={saving || !isDirty} className="flex items-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            SAVE CHANGES
          </GoldButton>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 mb-6 flex items-center gap-3 text-sm tracking-wide">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500 text-green-500 p-4 mb-6 flex items-center gap-3 text-sm tracking-wide">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {success}
        </div>
      )}

      {/* Section chips */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {areas.map(area => (
          <button
            key={area}
            onClick={() => handleAreaChange(area)}
            className={`px-3.5 py-2 text-[10px] font-bold tracking-widest uppercase rounded-sm border transition-colors ${
              activeArea === area ? 'bg-[#c5a059] text-bg border-[#c5a059]' : 'border-line text-muted hover:text-content hover:border-[#c5a059]/40'
            }`}
          >
            {AREA_META[area]?.label || area}
          </button>
        ))}
      </div>

      {/* Active section — open form, no box */}
      <div className="max-w-3xl">
        <div className="mb-5 pb-3 border-b border-line">
          <h2 className="text-sm font-bold tracking-widest text-content uppercase">
            {AREA_META[activeArea]?.label || activeArea}
          </h2>
          {AREA_META[activeArea]?.desc && (
            <p className="text-xs text-muted mt-1">{AREA_META[activeArea].desc}</p>
          )}
        </div>

        {(() => {
          const FormComp = SECTION_FORMS[activeArea];
          return FormComp ? (
            <FormComp data={editorData} onChange={handleChange} />
          ) : (
            <div className="space-y-2">
              {Object.entries(editorData).map(([key, value]) => renderField(key, value, [key]))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
