import React, { useState, useEffect } from 'react';
import { useContentContext } from '../../../context/ContentContext';
import { contentService } from '../../../features/content/services/contentService';
import { SiteContentMap, DEFAULT_SITE_CONTENT } from '../../../types';
import { Save, AlertCircle, RefreshCw, Box, Upload } from 'lucide-react';
import { GoldButton } from '../../GoldButton';

import { ImageUpload } from '../ImageUpload';
import { UploadSpecKey } from '../../../config/uploadSpecs';

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
};

function Field({ label, help, value, onChange, type = 'text', textarea = false }: any) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-content/70 mb-1.5">{label}</label>
      {textarea ? (
        <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={3}
          className="w-full bg-bg border border-[#c5a059]/20 px-3 py-2 text-sm text-content focus:outline-none focus:border-[#c5a059] transition-colors" />
      ) : (
        <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
          className="w-full bg-bg border border-[#c5a059]/20 px-3 py-2 text-sm text-content focus:outline-none focus:border-[#c5a059] transition-colors" />
      )}
      {help && <p className="text-[10px] text-muted mt-1 leading-relaxed">{help}</p>}
    </div>
  );
}

function Card({ title, desc, children }: any) {
  return (
    <div className="bg-bg/40 border border-[#c5a059]/10 p-5">
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
    </div>
  );
}

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
        <div key={key} className="mb-6 border border-[#c5a059]/20 p-4">
          <label className="block text-xs font-bold text-content tracking-widest uppercase mb-4">{key}</label>
          {value.map((item, index) => (
            <div key={index} className="mb-4 pb-4 border-b border-[#c5a059]/10 relative">
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
                        className="w-full bg-surface border border-[#c5a059]/20 px-3 py-2 text-sm focus:border-[#c5a059] focus:outline-none min-h-[100px]"
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
                         className="w-full bg-surface border border-[#c5a059]/20 px-3 py-2 text-sm focus:border-[#c5a059] focus:outline-none"
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
                   className="w-full bg-surface border border-[#c5a059]/20 px-3 py-2 text-sm focus:border-[#c5a059] focus:outline-none"
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
              className="w-full bg-surface border border-[#c5a059]/20 px-3 py-2 text-sm focus:border-[#c5a059] focus:outline-none font-mono tracking-widest text-[#c5a059] placeholder:text-muted/50"
            />
          </div>
        ) : typeof value === 'string' && (value.length > 50 || key === 'body' || key === 'copy' || key === 'address') ? (
          <textarea
            value={value as string}
            onChange={(e) => handleChange(path, e.target.value)}
            className="w-full bg-surface border border-[#c5a059]/20 px-3 py-2 text-sm focus:border-[#c5a059] focus:outline-none min-h-[100px] font-mono whitespace-pre"
          />
        ) : (
          <input
            type={typeof value === 'number' ? 'number' : 'text'}
            value={value !== undefined ? value : ''}
            onChange={(e) => handleChange(path, typeof value === 'number' ? Number(e.target.value) : e.target.value)}
            className="w-full bg-surface border border-[#c5a059]/20 px-3 py-2 text-sm focus:border-[#c5a059] focus:outline-none font-mono"
          />
        )}
      </div>
    );
  };

  const areas: (keyof SiteContentMap)[] = ['brand', 'home', 'philosophy', 'contact', 'footer', 'legal', 'seo', 'reviews'];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-[0.2em] text-content uppercase flex items-center gap-3">
            <Box className="w-6 h-6 text-[#c5a059]" />
            Site Content
          </h1>
          <p className="text-muted text-xs tracking-widest uppercase mt-2">Manage website copy and structure</p>
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

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-surface/50 border border-[#c5a059]/20 p-2 flex flex-col gap-1 sticky top-4">
            {areas.map(area => (
              <button
                key={area}
                onClick={() => handleAreaChange(area)}
                className={`text-left px-4 py-3 text-xs font-bold tracking-widest uppercase transition-colors ${
                  activeArea === area ? 'bg-[#c5a059] text-bg' : 'text-content hover:bg-[#c5a059]/10'
                }`}
              >
                {AREA_META[area]?.label || area}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 bg-surface border border-[#c5a059]/20 p-6">
          <div className="mb-6 pb-4 border-b border-[#c5a059]/20">
            <h2 className="text-lg font-bold tracking-[0.2em] text-[#c5a059] uppercase">
              {AREA_META[activeArea]?.label || activeArea}
            </h2>
            {AREA_META[activeArea]?.desc && (
              <p className="text-[10px] text-muted tracking-widest uppercase mt-1">{AREA_META[activeArea].desc}</p>
            )}
          </div>

          {activeArea === 'brand' ? (
            <BrandIdentityForm data={editorData} onChange={handleChange} />
          ) : (
            <div className="space-y-2">
              {Object.entries(editorData).map(([key, value]) => renderField(key, value, [key]))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
