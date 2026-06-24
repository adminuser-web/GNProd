import React, { useState, useEffect } from 'react';
import { useContentContext } from '../../../context/ContentContext';
import { contentService } from '../../../features/content/services/contentService';
import { SiteContentMap, DEFAULT_SITE_CONTENT } from '../../../types';
import { Save, AlertCircle, RefreshCw, Box, Upload } from 'lucide-react';
import { GoldButton } from '../../GoldButton';

import { ImageUpload } from '../ImageUpload';
import { UploadSpecKey } from '../../../config/uploadSpecs';

export function AdminContentEditorPage() {
  const { contentMap, refresh, loading: ctxLoading } = useContentContext();
  const [activeArea, setActiveArea] = useState<keyof SiteContentMap>('brand');
  const [editorData, setEditorData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!ctxLoading && contentMap) {
      setEditorData(contentMap[activeArea] || DEFAULT_SITE_CONTENT[activeArea]);
    }
  }, [activeArea, contentMap, ctxLoading]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await contentService.updateArea(activeArea, editorData);
      await refresh();
      setSuccess('Content updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update content');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (path: string[], value: any) => {
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
              value={value as string || ''}
              onChange={(url) => handleChange(path, url)}
              storagePath={`content/${activeArea}`}
            />
            <input
              type="text"
              placeholder="Or enter media URL manually"
              value={value as string || ''}
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

  const areas: (keyof SiteContentMap)[] = ['brand', 'home', 'philosophy', 'contact', 'footer', 'legal', 'reviews'];

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
        <GoldButton onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          SAVE CHANGES
        </GoldButton>
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
          <div className="bg-surface/50 border border-[#c5a059]/20 p-2 flex flex-col gap-1 sticky top-24">
            {areas.map(area => (
              <button
                key={area}
                onClick={() => setActiveArea(area)}
                className={`text-left px-4 py-3 text-xs font-bold tracking-widest uppercase transition-colors ${
                  activeArea === area ? 'bg-[#c5a059] text-bg' : 'text-content hover:bg-[#c5a059]/10'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 bg-surface border border-[#c5a059]/20 p-6">
          <h2 className="text-lg font-bold tracking-[0.2em] text-[#c5a059] uppercase mb-6 pb-4 border-b border-[#c5a059]/20">
            Editing {activeArea} Content
          </h2>
          
          <div className="space-y-2">
            {Object.entries(editorData).map(([key, value]) => renderField(key, value, [key]))}
          </div>
        </div>
      </div>
    </div>
  );
}
