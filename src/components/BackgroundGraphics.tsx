import React from 'react';

export function BackgroundGraphics() {
  return (
    <div className="fixed inset-0 z-base overflow-hidden pointer-events-none bg-bg">
      {/* Static Ambient Base (Aurora effect via radial gradients) */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 85% 10%, rgba(197, 160, 89, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 10% 90%, rgba(197, 160, 89, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 35% 45%, rgba(197, 160, 89, 0.05) 0%, transparent 45%)
          `
        }}
      />

      {/* Static Noise Texture Overlay (gives pure white a matte, printed-paper feel) */}
      <div 
        className="absolute inset-0 z-raised opacity-[0.03] dark:opacity-[0.05] mix-blend-multiply dark:mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
    </div>
  );
}
