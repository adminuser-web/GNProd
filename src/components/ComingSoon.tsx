import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Instagram } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { resolveThemedImage } from '../lib/themedImage';

const DEFAULT_HERO =
  'https://ycebmqpayiiejcfukjra.supabase.co/storage/v1/object/public/media/products/debutant/1782887114344-DebutantCover.png';

/**
 * Full-screen "Launching Soon" splash shown while maintenance mode is on.
 * Cricket-themed: the brand logo + headline on the left, and a hero bat photo
 * on the right wrapped in a pulsing gold glow with a light sweep. All motion is
 * disabled for `prefers-reduced-motion`.
 */
export function ComingSoon() {
  const brand = useContent('brand');
  const m = useContent('maintenance');

  const logo = brand?.logoUrl ? resolveThemedImage(brand.logoUrl as any, 'dark') : '';
  const hero = (m?.heroImage as string) || DEFAULT_HERO;
  const wa = (brand?.contact?.whatsapp || '').replace(/[^\d]/g, '');
  const ig = brand?.contact?.instagram || (brand?.social?.instagram ? `https://instagram.com/${brand.social.instagram}` : '');
  const headline = m?.headline || 'Launching Soon';
  const subtext = m?.subtext || 'Something special is being crafted.';

  return (
    <div className="csm-root">
      <style>{CSS}</style>
      <div className="csm-glow" />
      <div className="csm-vign" />
      <div className="csm-dust">{Array.from({ length: 5 }).map((_, i) => <i key={i} />)}</div>

      <div className="csm-content">
        <div className="csm-brand">
          {logo && <img className="csm-logo" src={logo} alt="" />}
          <span className="csm-name">{brand?.brandName || 'GRAINOOD'}</span>
        </div>
        <p className="csm-eyebrow">English Willow · Handcrafted</p>
        <h1 className="csm-title">{headline}</h1>
        <p className="csm-sub">{subtext}</p>
        <div className="csm-btns">
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="csm-btn">
              <MessageCircle size={14} /> WhatsApp
            </a>
          )}
          {ig && (
            <a href={ig} target="_blank" rel="noreferrer" className="csm-btn">
              <Instagram size={14} /> Instagram
            </a>
          )}
        </div>
      </div>

      <div className="csm-stage">
        <div className="csm-halo" />
        <div className="csm-batwrap">
          <img className="csm-bat" src={hero} alt="Grainood English Willow bat" />
        </div>
      </div>

      <Link to="/login" className="csm-team">Team login</Link>
    </div>
  );
}

const GOLD = '#c5a059';

const CSS = `
.csm-root{position:relative;min-height:100vh;overflow:hidden;display:flex;align-items:center;
  background:radial-gradient(130% 100% at 66% 30%, #17130b 0%, #0b0b0d 52%, #050506 100%);
  color:#fff;font-family:inherit;isolation:isolate}
.csm-glow{position:absolute;inset:0;pointer-events:none;background:radial-gradient(600px circle at 72% 46%, rgba(197,160,89,.16), transparent 60%)}
.csm-vign{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 220px 70px rgba(0,0,0,.72)}
.csm-dust i{position:absolute;bottom:-8px;width:3px;height:3px;border-radius:50%;background:${GOLD};opacity:0;filter:drop-shadow(0 0 4px ${GOLD});animation:csm-drift 8s linear infinite}
.csm-dust i:nth-child(1){left:60%;animation-delay:0s}.csm-dust i:nth-child(2){left:68%;animation-delay:2.4s}
.csm-dust i:nth-child(3){left:76%;animation-delay:4.2s}.csm-dust i:nth-child(4){left:84%;animation-delay:1.4s}.csm-dust i:nth-child(5){left:90%;animation-delay:3.4s}
@keyframes csm-drift{0%{transform:translateY(0);opacity:0}12%{opacity:.7}92%{opacity:.15}100%{transform:translateY(-100vh);opacity:0}}

.csm-content{position:relative;z-index:3;width:54%;padding:0 5% 0 8%;text-align:left}
.csm-brand{display:flex;align-items:center;gap:16px;margin-bottom:24px}
.csm-logo{height:52px;width:auto;filter:drop-shadow(0 0 12px rgba(197,160,89,.5));animation:csm-pulse 3s ease-in-out infinite}
.csm-name{font-size:clamp(22px,2.4vw,30px);font-weight:800;letter-spacing:.2em;text-transform:uppercase;line-height:1;
  color:${GOLD};background:linear-gradient(180deg,#e6c780,${GOLD} 55%,#9c7c3e);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;
  filter:drop-shadow(0 0 14px rgba(197,160,89,.35))}
@keyframes csm-pulse{0%,100%{filter:drop-shadow(0 0 8px rgba(197,160,89,.35))}50%{filter:drop-shadow(0 0 18px rgba(197,160,89,.8))}}
.csm-eyebrow{margin:0 0 14px;font-size:11px;letter-spacing:.38em;text-transform:uppercase;color:${GOLD}}
.csm-title{margin:0 0 16px;font-size:clamp(34px,6vw,64px);font-weight:800;letter-spacing:-.01em;text-transform:uppercase;line-height:1;
  background:linear-gradient(100deg,#fff 32%,#f4e3b6 46%,${GOLD} 52%,#fff 66%);background-size:250% 100%;
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:csm-shimmer 5s linear infinite}
@keyframes csm-shimmer{0%{background-position:180% 0}100%{background-position:-80% 0}}
.csm-sub{margin:0 0 28px;max-width:440px;font-size:15px;line-height:1.65;color:rgba(255,255,255,.72);font-weight:300}
.csm-btns{display:flex;gap:14px;flex-wrap:wrap}
.csm-btn{display:inline-flex;align-items:center;gap:8px;font-size:10px;letter-spacing:.2em;text-transform:uppercase;font-weight:700;color:${GOLD};
  border:1px solid rgba(197,160,89,.45);padding:12px 22px;transition:all .25s}
.csm-btn:hover{background:${GOLD};color:#0b0b0d}

.csm-stage{position:relative;z-index:2;flex:1;height:100vh;display:flex;align-items:center;justify-content:center}
.csm-halo{position:absolute;width:min(34vw,420px);height:min(58vh,560px);border-radius:50%;
  background:radial-gradient(closest-side, rgba(197,160,89,.30), rgba(197,160,89,.08) 55%, transparent 72%);filter:blur(12px);animation:csm-halo 4.5s ease-in-out infinite}
@keyframes csm-halo{0%,100%{opacity:.7;transform:scale(.96)}50%{opacity:1;transform:scale(1.05)}}
.csm-batwrap{position:relative;height:82vh;display:flex;align-items:center;animation:csm-float 6s ease-in-out infinite}
@keyframes csm-float{0%,100%{transform:translateY(-6px)}50%{transform:translateY(7px)}}
/* screen blend drops the photo's dark/near-black background so no rectangle
   shows on the splash — the bat blends into the glow. (Use a black/transparent
   hero image for the cleanest result.) */
.csm-bat{height:100%;width:auto;object-fit:contain;mix-blend-mode:screen;
  filter:drop-shadow(0 0 20px rgba(197,160,89,.5)) drop-shadow(0 0 48px rgba(197,160,89,.3));
  animation:csm-batglow 4.5s ease-in-out infinite}
@keyframes csm-batglow{0%,100%{filter:drop-shadow(0 0 14px rgba(197,160,89,.38)) drop-shadow(0 0 34px rgba(197,160,89,.2))}
  50%{filter:drop-shadow(0 0 26px rgba(197,160,89,.75)) drop-shadow(0 0 64px rgba(197,160,89,.4))}}

.csm-team{position:absolute;left:0;right:0;bottom:22px;text-align:center;font-size:9px;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,.35);z-index:3;text-decoration:none;transition:color .25s}
.csm-team:hover{color:${GOLD}}

@media (max-width:768px){
  .csm-root{flex-direction:column;justify-content:flex-start;text-align:center;padding-top:7vh}
  .csm-stage{order:1;height:40vh;flex:none;width:100%}
  .csm-batwrap{height:38vh}
  .csm-halo{width:66vw;height:38vh}
  .csm-content{width:100%;padding:4vh 24px 0;text-align:center;order:2}
  .csm-brand{justify-content:center;gap:12px;margin-bottom:18px}
  .csm-logo{height:44px}
  .csm-content .csm-btns{justify-content:center}
  .csm-sub{margin-left:auto;margin-right:auto}
}
@media (prefers-reduced-motion: reduce){
  .csm-dust i,.csm-batwrap,.csm-halo,.csm-logo{animation:none}
  .csm-title{animation:none;background-position:0 0}
}
`;
