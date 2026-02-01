
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Coupon, Hall, Service } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Ticket, Plus, Tag, Calendar, Percent, Landmark, Trash2, Edit, CheckCircle2, Building2, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const VendorCoupons: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCoupon, setCurrentCoupon] = useState<Partial<Coupon>>({ 
    discount_type: 'percentage', 
    applicable_to: 'both',
    target_ids: [],
    is_active: true 
  });
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cRes, hRes, sRes] = await Promise.all([
      supabase.from('coupons').select('*').eq('vendor_id', user.id).order('created_at', { ascending: false }),
      supabase.from('halls').select('*').eq('vendor_id', user.id),
      supabase.from('services').select('*').eq('vendor_id', user.id)
    ]);
    if (cRes.data) setCoupons(cRes.data as Coupon[]);
    if (hRes.data) setHalls(hRes.data);
    if (sRes.data) setServices(sRes.data);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!currentCoupon.code || !currentCoupon.discount_value) return;
    const payload = { ...currentCoupon, vendor_id: user.id };
    const { error } = currentCoupon.id 
      ? await supabase.from('coupons').update(payload).eq('id', currentCoupon.id)
      : await supabase.from('coupons').insert([payload]);

    if (!error) {
      toast({ title: 'تم حفظ الكوبون', variant: 'success' });
      setIsModalOpen(false);
      fetchData();
    }
  };

  return (
    <div className="space-y-8 text-right pb-10">
      <div className="flex justify-between items-center flex-row-reverse">
        <div>
          <h2 className="text-3xl font-ruqaa text-primary">الخصومات والكوبونات</h2>
          <p className="text-sm text-muted-foreground mt-1">أنشئ عروضاً خاصة لزيادة مبيعات قاعاتك وخدماتك.</p>
        </div>
        <Button onClick={() => { setCurrentCoupon({ discount_type: 'percentage', applicable_to: 'both', target_ids: [], is_active: true }); setIsModalOpen(true); }} className="h-12 px-8 rounded-xl font-bold gap-2">
           إنشاء كوبون <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({length: 3}).map((_, i) => <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-[2rem]"></div>)
        ) : coupons.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[2.5rem] opacity-50 font-bold">لا يوجد عروض نشطة حالياً.</div>
        ) : coupons.map(c => (
          <div key={c.id} className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm relative overflow-hidden group">
             <div className="flex justify-between items-start mb-6 flex-row-reverse">
                <div className="bg-primary/5 p-3 rounded-2xl text-primary"><Tag className="w-5 h-5" /></div>
                <Badge variant={c.is_active ? 'success' : 'destructive'} className="rounded-lg">{c.is_active ? 'نشط' : 'معطل'}</Badge>
             </div>
             <div className="space-y-2">
                <h4 className="text-2xl font-black text-gray-900 tracking-wider">{c.code}</h4>
                <p className="text-xs font-bold text-gray-400">
                  {c.discount_type === 'percentage' ? `خصم ${c.discount_value}%` : `خصم ثابت ${c.discount_value} SAR`}
                </p>
             </div>
             <div className="mt-6 flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-t pt-4">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> ينتهي: {c.end_date}</span>
             </div>
             <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg" onClick={async () => { await supabase.from('coupons').delete().eq('id', c.id); fetchData(); }}><Trash2 className="w-4 h-4" /></button>
             </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إعداد الكوبون الجديد">
         <div className="space-y-6 text-right">
            <div className="grid grid-cols-2 gap-4">
               <Input label="رمز الكوبون" placeholder="EID2025" value={currentCoupon.code || ''} onChange={e => setCurrentCoupon({...currentCoupon, code: e.target.value.toUpperCase()})} className="h-12 rounded-xl text-right font-black" />
               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">نوع الخصم</label>
                  <select className="w-full h-12 border rounded-xl px-4 text-sm font-bold bg-gray-50" value={currentCoupon.discount_type} onChange={e => setCurrentCoupon({...currentCoupon, discount_type: e.target.value as any})}>
                     <option value="percentage">نسبة مئوية (%)</option>
                     <option value="fixed">مبلغ ثابت (SAR)</option>
                  </select>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <Input label="قيمة الخصم" type="number" value={currentCoupon.discount_value || ''} onChange={e => setCurrentCoupon({...currentCoupon, discount_value: Number(e.target.value)})} className="h-12 rounded-xl text-right font-bold" />
               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400">ينطبق على</label>
                  <select className="w-full h-12 border rounded-xl px-4 text-sm font-bold bg-gray-50" value={currentCoupon.applicable_to} onChange={e => setCurrentCoupon({...currentCoupon, applicable_to: e.target.value as any})}>
                     <option value="both">الكل (قاعات وخدمات)</option>
                     <option value="halls">القاعات فقط</option>
                     <option value="services">الخدمات فقط</option>
                  </select>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <Input label="تاريخ البدء" type="date" value={currentCoupon.start_date || ''} onChange={e => setCurrentCoupon({...currentCoupon, start_date: e.target.value})} className="h-12 rounded-xl font-bold" />
               <Input label="تاريخ الانتهاء" type="date" value={currentCoupon.end_date || ''} onChange={e => setCurrentCoupon({...currentCoupon, end_date: e.target.value})} className="h-12 rounded-xl font-bold" />
            </div>

            <Button onClick={handleSave} className="w-full h-14 rounded-xl font-black text-lg shadow-xl shadow-primary/20">تفعيل العرض</Button>
         </div>
      </Modal>
    </div>
  );
};
