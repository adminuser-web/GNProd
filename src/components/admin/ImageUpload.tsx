import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Check, AlertTriangle, Info } from 'lucide-react';
import { UPLOAD_SPECS, UploadSpecKey } from '../../config/uploadSpecs';
import { uploadToStorage } from '../../lib/storage';
import { clsx } from 'clsx';
import { ThemedImage } from '../../types';

interface SingleImageUploadProps {
  specKey: UploadSpecKey;
  value?: string;
  onChange: (url: string, file?: File) => void;
  storagePath: string;
  className?: string;
  label?: string;
  fallbackNotice?: string;
}

function SingleImageUpload({ specKey, value, onChange, storagePath, className, label, fallbackNotice }: SingleImageUploadProps) {
  const spec = UPLOAD_SPECS[specKey];
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validationMsg, setValidationMsg] = useState<{ type: 'ok' | 'warn' | 'error', text: string } | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${Math.round(bytes / 1024)}KB`;
  };

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [canUpload, setCanUpload] = useState(false);
  const [needsCanvasResize, setNeedsCanvasResize] = useState(false);

  const validateFile = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      setValidationMsg(null);
      setNeedsCanvasResize(false);
      
      if (file.size > spec.maxBytes) {
        setValidationMsg({ type: 'error', text: `File too large. Max ${formatSize(spec.maxBytes)}.` });
        resolve(false);
        return;
      }

      if (file.type.startsWith('video/')) {
        resolve(true);
        return;
      }

      const isPngRequired = spec.formats.includes('PNG (Required)');
      if (isPngRequired && file.type !== 'image/png') {
        setValidationMsg({ type: 'warn', text: `PNG recommended for transparency. You uploaded ${file.type.split('/')[1] || file.type}` });
      }

      if (!file.type.startsWith('image/')) {
        resolve(true);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        
        const aspect = width / height;
        const recommendedAspect = spec.recommendedWidth / spec.recommendedHeight;
        const aspectDiff = Math.abs(aspect - recommendedAspect);
        
        if (width > spec.recommendedWidth * 1.5 || height > spec.recommendedHeight * 1.5) {
           setValidationMsg({ type: 'warn', text: `Large dimensions (${width}x${height}). Consider scaling it down.` });
           setNeedsCanvasResize(true);
        } else if (aspectDiff > 0.2 && spec.aspectLabel !== 'Any') {
           setValidationMsg({ type: 'warn', text: `Aspect ratio offset. Recommended: ${spec.aspectLabel}.` });
        } else if (!isPngRequired) {
           setValidationMsg({ type: 'ok', text: `Looks good (${width}x${height}, ${formatSize(file.size)})` });
        }
        resolve(true);
      };
      img.onerror = () => {
        setValidationMsg({ type: 'error', text: 'Invalid image file.' });
        resolve(false);
      }
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setPendingFile(file);
    setPendingPreviewUrl(URL.createObjectURL(file));
    
    const canProceed = await validateFile(file);
    setCanUpload(canProceed);
  };

  const resizeAndUpload = () => {
    if (!pendingFile) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return overrideAndUpload(pendingFile);

      // Scale to recommended width
      const scale = spec.recommendedWidth / img.naturalWidth;
      canvas.width = spec.recommendedWidth;
      canvas.height = img.naturalHeight * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return overrideAndUpload(pendingFile);
          const scaledFile = new File([blob], `scaled-${pendingFile.name}`, { type: 'image/jpeg' });
          overrideAndUpload(scaledFile);
        },
        'image/jpeg',
        0.85
      );
    };
    img.src = URL.createObjectURL(pendingFile);
  };

  const overrideAndUpload = async (file: File) => {
    setIsUploading(true);
    setProgress(30);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
      const fullPath = `${storagePath}/${Date.now()}-${safeName}`;
      const url = await uploadToStorage(fullPath, file);
      setProgress(100);
      onChange(url, file);
      setIsUploading(false);
      setPendingFile(null);
      setPendingPreviewUrl(null);
    } catch (error: any) {
      console.error('Upload failed', error);
      setValidationMsg({ type: 'error', text: error.message || 'Upload failed' });
      setIsUploading(false);
    }
  };

  const isVideoField = specKey === 'heroVideo';
  const accepts = isVideoField ? "video/*" : (specKey === 'supportAttachment' ? "image/*,application/pdf" : "image/*");

  return (
    <div className={clsx("flex flex-col gap-2 p-3 bg-elevated border border-[#c5a059]/10 rounded-sm relative", className)}>
      {label && <div className="text-xs uppercase tracking-widest text-[#c5a059] font-bold mb-1">{label}</div>}
      <div className="flex gap-4 items-start w-full">
        {/* Preview Area */}
        <div className="shrink-0 w-24 h-24 bg-surface border border-[#c5a059]/10 p-1 flex items-center justify-center relative overflow-hidden group">
          {pendingPreviewUrl ? (
             isVideoField || pendingPreviewUrl.endsWith('.mp4') ? (
                <video src={pendingPreviewUrl} className="w-full h-full object-cover" muted />
             ) : (
                <img src={pendingPreviewUrl} alt="Preview" className="w-full h-full object-contain" />
             )
          ) : value ? (
             isVideoField || value.endsWith('.mp4') ? (
                <video src={value} className="w-full h-full object-cover" muted />
             ) : value.endsWith('.pdf') ? (
                <div className="text-[10px] text-content/50 uppercase tracking-widest text-center">PDF<br/>Doc</div>
             ) : (
                <img src={value} alt="Preview" className="w-full h-full object-contain" />
             )
          ) : (
             <div className="text-[10px] text-content/30 uppercase tracking-widest text-center text-balance leading-tight px-1">
                 {fallbackNotice ? fallbackNotice : <>No<br/>Media</>}
             </div>
          )}
          {value && !isUploading && !pendingFile && (
            <button 
               onClick={(e) => { e.preventDefault(); onChange(''); }} 
               className="absolute top-1 right-1 bg-bg/80 backdrop-blur-sm text-content hover:text-red-400 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
               title="Remove"
               type="button"
            >
              <X size={12} />
            </button>
          )}
          {pendingFile && !isUploading && (
            <button 
               onClick={(e) => { 
                 e.preventDefault(); 
                 setPendingFile(null); 
                 setPendingPreviewUrl(null); 
                 setValidationMsg(null);
               }} 
               className="absolute top-1 right-1 bg-bg/80 backdrop-blur-sm text-content hover:text-red-400 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
               title="Cancel Selection"
               type="button"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1 min-w-0 flex flex-col items-start pt-1">
          {isUploading ? (
            <div className="w-full relative h-[38px] bg-surface border border-[#c5a059]/20 flex items-center px-4">
              <div 
                className="absolute left-0 top-0 bottom-0 bg-[#c5a059]/20 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
              <span className="relative z-10 text-xs font-mono text-content">Uploading {Math.round(progress)}%</span>
            </div>
          ) : pendingFile ? (
            <div className="flex flex-wrap gap-2">
              <button 
                type="button"
                onClick={() => canUpload && overrideAndUpload(pendingFile)}
                disabled={!canUpload}
                className={clsx(
                  "h-[38px] px-4 font-bold text-[10px] uppercase tracking-widest border transition-colors flex items-center gap-2",
                  canUpload ? "bg-[#c5a059] text-white hover:bg-yellow-600 border-transparent" : "bg-surface border-[#c5a059]/20 text-muted opacity-50 cursor-not-allowed"
                )}
              >
                <Upload size={14} /> Upload Now
              </button>
              {needsCanvasResize && (
                 <button 
                   type="button"
                   onClick={resizeAndUpload}
                   className="h-[38px] px-4 font-bold text-[10px] uppercase tracking-widest border border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center gap-2"
                 >
                   Compress & Upload
                 </button>
              )}
            </div>
          ) : (
            <label className="h-[38px] px-6 text-[#c5a059] hover:text-content hover:bg-[#c5a059]/10 cursor-pointer border border-[#c5a059]/20 flex items-center justify-center bg-surface transition-colors">
              <input 
                ref={fileInputRef}
                type="file" 
                accept={accepts} 
                className="hidden" 
                onChange={handleFileChange} 
              />
              <Upload size={14} className="mr-2" /> 
              <span className="text-xs uppercase tracking-widest font-bold">{value ? 'Replace' : 'Upload'}</span>
            </label>
          )}
          
          {/* Validation Feedback */}
          {validationMsg && (
            <div className={clsx(
              "mt-2 flex items-center gap-1.5 text-xs",
              validationMsg.type === 'ok' ? "text-green-500" :
              validationMsg.type === 'warn' ? "text-yellow-500" :
              "text-red-500"
            )}>
               {validationMsg.type === 'ok' ? <Check size={12} /> : <AlertTriangle size={12} />}
               <span className="leading-tight">{validationMsg.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* Inline Hint and Info Popover */}
      <div className="text-[10px] leading-relaxed text-muted font-sans relative flex items-start gap-1 mt-2">
        <span>
          <span className="uppercase tracking-widest text-content/60 font-bold">Recommended:</span>{' '}
          {spec.formats.join(', ')} &middot; {spec.aspectLabel} ({spec.recommendedWidth}x{spec.recommendedHeight}) &middot; Max {formatSize(spec.maxBytes)}{' '}
          <span className="text-content/80">&ndash; {spec.hint}</span>
        </span>
        <button 
           type="button" 
           onClick={() => setShowInfo(!showInfo)} 
           className="text-[#c5a059] hover:text-white shrink-0 outline-none p-0.5"
           aria-label="More info"
        >
          <Info size={12} />
        </button>

        {showInfo && (
           <>
             <div className="fixed inset-0 z-40" onClick={() => setShowInfo(false)} />
             <div className="absolute top-full left-0 mt-2 z-50 w-64 bg-surface border border-[#c5a059]/30 p-3 shadow-xl backdrop-blur-md">
               <div className="text-[10px] text-white/90 leading-relaxed font-sans">
                 <strong>Why this matters:</strong> {spec.why}
               </div>
             </div>
           </>
        )}
      </div>
    </div>
  );
}

interface ImageUploadProps {
  specKey: UploadSpecKey;
  value?: ThemedImage | string;
  onChange: (value: ThemedImage | string, file?: File) => void;
  storagePath: string;
  className?: string;
  supportThemes?: boolean;
}

export function ImageUpload({ specKey, value, onChange, storagePath, className, supportThemes = true }: ImageUploadProps) {
  // Coerce string to { light: string, dark: string } internally for editor
  const lightVal = typeof value === 'string' ? value : (value?.light || '');
  const darkVal = typeof value === 'string' ? '' : (value?.dark || '');

  const handleChange = (themeMode: 'light' | 'dark', url: string, file?: File) => {
    // If we only support strings or it's turned off
    if (!supportThemes) {
      onChange(url, file);
      return;
    }

    const newVal = {
      light: themeMode === 'light' ? url : lightVal,
      dark: themeMode === 'dark' ? url : darkVal
    };
    
    // If both empty, return empty string
    if (!newVal.light && !newVal.dark) {
      onChange('', file);
      return;
    }
    onChange(newVal, file);
  };

  if (!supportThemes) {
    return (
       <SingleImageUpload 
         specKey={specKey}
         value={typeof value === 'string' ? value : value?.light}
         onChange={(url, file) => onChange(url, file)}
         storagePath={storagePath}
         className={className}
       />
    );
  }

  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      <SingleImageUpload 
        label="Light Theme Image"
        specKey={specKey}
        value={lightVal}
        onChange={(url, file) => handleChange('light', url, file)}
        storagePath={storagePath}
        fallbackNotice={darkVal && !lightVal ? "Using Dark for Light" : undefined}
      />
      <SingleImageUpload 
        label="Dark Theme Image"
        specKey={specKey}
        value={darkVal}
        onChange={(url, file) => handleChange('dark', url, file)}
        storagePath={storagePath}
        fallbackNotice={lightVal && !darkVal ? "Using Light for Dark" : undefined}
      />
    </div>
  );
}

