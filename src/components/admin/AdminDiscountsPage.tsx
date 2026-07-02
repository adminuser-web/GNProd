import React, { useEffect, useState } from 'react';
import { pricingConfigAdminService } from '../../features/products/services/pricingConfigAdminService';
import { PageHeader, EmptyState } from './ui';
import { Skeleton } from '../Skeleton';
import { Tag, Plus, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

type Code = any;

const blankForm = { code: '', type: 'percent' as 'percent' | 'flat', amount: '', expiresAt: '', maxUses: '' };

export function AdminDiscountsPage() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.title = 'Discounts — Admin'; }, []);

  const load = async () => {
    setLoading(true);
    try { setCodes(await pricingConfigAdminService.getDiscountCodes()); }
    catch { toast.error('Could not load discount codes.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    const amount = Number(form.amount);
    if (!code) return toast.error('Enter a code.');
    if (!amount || amount <= 0) return toast.error('Enter a valid amount.');
    if (form.type === 'percent' && amount > 100) return toast.error('Percentage cannot exceed 100.');
    if (codes.some((c) => (c.code || '').toUpperCase() === code)) return toast.error('That code already exists.');

    setSaving(true);
    try {
      await pricingConfigAdminService.createDiscountCode({
        code,
        type: form.type,
        amount,
        active: true,
        ...(form.expiresAt ? { expiresAt: new Date(form.expiresAt + 'T23:59:59').getTime() } : {}),
        ...(form.maxUses ? { maxUses: Number(form.maxUses) } : {}),
      } as any);
      toast.success(`Code ${code} created.`);
      setForm(blankForm);
      await load();
    } catch (err: any) {
      toast.error('Could not create the code.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Code) => {
    try { await pricingConfigAdminService.updateDiscountCode(c.id, { active: !c.active } as any); await load(); }
    catch { toast.error('Could not update the code.'); }
  };

  const remove = async (c: Code) => {
    if (!confirm(`Delete code ${c.code}? This cannot be undone.`)) return;
    try { await pricingConfigAdminService.deleteDiscountCode(c.id); toast.success('Code deleted.'); await load(); }
    catch { toast.error('Could not delete the code.'); }
  };

  const fmtExpiry = (ms?: number) => ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const isExpired = (ms?: number) => typeof ms === 'number' && ms < Date.now();

  const input = 'w-full bg-bg border border-line rounded-sm px-3 py-2 text-sm text-content focus:outline-none focus:border-[#c5a059]';
  const label = 'block text-[10px] font-bold uppercase tracking-widest text-muted mb-1.5';

  return (
    <div className="pb-10">
      <PageHeader eyebrow="Commerce" title="Discount Codes" description={`${codes.length} ${codes.length === 1 ? 'code' : 'codes'}`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Create form */}
        <form onSubmit={handleCreate} className="border border-line rounded-xl p-4 space-y-4">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-2"><Plus size={13} className="text-[#c5a059]" /> New Code</h2>
          <div>
            <label className={label}>Code</label>
            <input className={`${input} font-mono uppercase`} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Type</label>
              <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
                <option value="percent">Percent %</option>
                <option value="flat">Flat ₹</option>
              </select>
            </div>
            <div>
              <label className={label}>{form.type === 'percent' ? 'Percent (%)' : 'Amount (₹)'}</label>
              <input className={input} type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder={form.type === 'percent' ? '10' : '500'} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Expires (optional)</label>
              <input className={input} type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </div>
            <div>
              <label className={label}>Max uses (optional)</label>
              <input className={input} type="number" min="1" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="∞" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full bg-[#c5a059] text-bg text-[10px] font-bold uppercase tracking-widest py-2.5 rounded-sm hover:bg-premium-gold-text transition-colors disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Code'}
          </button>
          <p className="text-[10px] text-muted leading-relaxed">Codes are validated and applied at checkout. Max uses counts paid orders; leave blank for unlimited.</p>
        </form>

        {/* List */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" className="h-14" />)}</div>
          ) : codes.length === 0 ? (
            <div className="border border-line border-dashed rounded-xl">
              <EmptyState icon={Tag} title="No discount codes yet" description="Create your first code with the form on the left." />
            </div>
          ) : (
            <div className="rounded-xl border border-line overflow-hidden">
              <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 text-[9px] uppercase tracking-[0.2em] font-bold text-muted bg-bg border-b border-line">
                <div className="col-span-3">Code</div>
                <div className="col-span-2">Value</div>
                <div className="col-span-3">Expiry</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              <div className="divide-y divide-line">
                {codes.map((c) => {
                  const expired = isExpired(c.expiresAt);
                  const off = c.active && !expired;
                  return (
                    <div key={c.id} className="px-4 py-3 grid grid-cols-2 md:grid-cols-12 gap-3 items-center">
                      <div className="md:col-span-3 min-w-0">
                        <span className="font-mono font-bold text-content text-sm">{c.code}</span>
                        {c.maxUses ? <span className="block text-[10px] text-muted">max {c.maxUses} uses</span> : null}
                      </div>
                      <div className="md:col-span-2 text-sm text-[#c5a059] font-bold">{c.type === 'percent' ? `${c.amount}%` : `₹${Number(c.amount).toLocaleString('en-IN')}`}</div>
                      <div className={`md:col-span-3 text-xs ${expired ? 'text-red-400' : 'text-muted'}`}>{fmtExpiry(c.expiresAt)}{expired ? ' · expired' : ''}</div>
                      <div className="md:col-span-2 md:text-center">
                        <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-sm border ${off ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' : 'text-muted border-line'}`}>
                          {expired ? 'Expired' : c.active ? 'Active' : 'Off'}
                        </span>
                      </div>
                      <div className="md:col-span-2 flex items-center md:justify-end gap-2">
                        <button onClick={() => toggleActive(c)} title={c.active ? 'Turn off' : 'Turn on'} className="w-8 h-8 rounded-sm flex items-center justify-center text-muted hover:text-[#c5a059] hover:bg-[#c5a059]/10 border border-line transition-colors">
                          {c.active ? <X size={14} /> : <Check size={14} />}
                        </button>
                        <button onClick={() => remove(c)} title="Delete" className="w-8 h-8 rounded-sm flex items-center justify-center text-muted hover:text-red-400 hover:bg-red-500/10 border border-line transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
