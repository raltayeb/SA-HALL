
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Coupon, Hall, Service, Chalet } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Ticket, Plus, Tag, Calendar, Trash2, CheckCircle2, Building2, Sparkles, Palmtree, Info, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const VendorCoupons: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [chalets, setChalets] = useState<Chalet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [currentCoupon, setCurrentCoupon] = useState<Partial<Coupon>>({ 
    discount_type: 'percentage', 
    applicable_to: 'both',
    target_ids: [],
    is_active: true,
    start_date: new Date().toISOString().split('T')[0]
  });
  
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cRes, hRes, chRes, sRes] = await Promise.all([
      supabase.from('coupons').select('*').eq('vendor_id', user.id).order('created_at', { ascending: false }),
      supabase.from('halls').select('id, name').eq('vendor_id', user.id),
      supabase.from('chalets').select('id, name').eq('vendor_id', user.id),
      supabase.from('services').select('id, name').eq('vendor_id', user.id),
    ]);
    
    setCoupons(cRes.data as Coupon[] || []);
    setHalls(hRes.data as Hall[] || []);
    setChalets(chRes.data as Chalet[] || []);
    setServices(sRes.data as Service[] || []);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleTarget = (id: string) => {
    const targets = [...(currentCoupon.target_ids || [])];
    const index = targets.indexOf(id);
    if (index > -1) targets.splice(index, 1);
    else targets.push(id);
    setCurrentCoupon({ ...currentCoupon, target_ids: targets });
  };

  const handleSave = async () => {
    if (!currentCoupon.code || !currentCoupon.discount_value || !currentCoupon.end_date) {
      toast({ title: 'خطأ', description: 'البيانات ناقصة.', variant: 'destructive' });
      return;
    }
    const payload = { ...currentCoupon, vendor_id: user.id };
    const { error } = currentCoupon.id 
      ? await supabase.from('coupons').update(payload).eq('id', currentCoupon.id)
      : await supabase.from('coupons').insert([payload]);

    if (!error) {
      toast({ title: 'تم الحفظ', variant: 'success' });
      setIsModalOpen(false);
      setCurrentCoupon({ discount_type: 'percentage', applicable_to: 'both', target_ids: [], is_active: true, start_date: new Date().toISOString().split('T')[0] });
      fetchData();
    } else {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
      if(!confirm('حذف الكوبون نهائياً؟')) return;
      await supabase.from('coupons').delete().eq('id', id);
      fetchData();
  };

  return (
    <div className="space-y-8 pb-20 font-tajawal text-right">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-primary flex items-center gap-2">
             الخصومات والعروض <Ticket className="w-6 h-6" />
          </h2>
          <p className="text-xs font-bold text-gray-400 mt-1">إنشاء أكواد خصم للقاعات والخدمات.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="h-12 px-6 rounded-2xl font-black gap-2 bg-gray-900 text-white shadow-lg shadow-primary/20">
           كوبون جديد <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? [1,2,3].map(i => <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-[2rem]"></div>) : coupons.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-200 rounded-[2.5rem] opacity-50">
            <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="font-bold text-gray-400">لا توجد كوبونات نشطة.</p>
          </div>
        ) : coupons.map(c => (
          <div key={c.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-6 relative overflow-hidden group hover:border-primary/30 transition-all">
             <div className="flex justify-between items-start mb-4">
                <div className="bg-primary/5 p-3 rounded-2xl text-primary"><Tag className="w-5 h-5" /></div>
                <div className={`px-3 py-1 rounded-xl text-[10px] font-black ${c.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {c.is_active ? 'نشط' : 'معطل'}
                </div>
             </div>
             <div className="space-y-1">
                <h4 className="text-2xl font-black text-gray-900 font-mono tracking-wider">{c.code}</h4>
                <p className="text-sm font-black text-primary">
                  {c.discount_type === 'percentage' ? `خصم ${c.discount_value}%` : `خصم ${c.discount_value} ر.س`}
                </p>
                <div className="text-[10px] font-bold text-gray-400 mt-2">
                    ينطبق على: {c.target_ids?.length ? `${c.target_ids.length} عناصر` : 'الكل'}
                </div>
             </div>
             <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> ينتهي: {c.end_date}
                </span>
                <button onClick={() => handleDelete(c.id)} className="p-2 rounded-xl text-red-300 hover:text-red-500 hover:bg-red-50 transition-all">
                    <Trash2 className="w-4 h-4" />
                </button>
             </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إعداد كوبون خصم" className="max-w-xl">
         <div className="space-y-5 text-right">
            <div className="grid grid-cols-2 gap-4">
               <Input label="الكود (EN)" placeholder="SALE20" value={currentCoupon.code || ''} onChange={e => setCurrentCoupon({...currentCoupon, code: e.target.value.toUpperCase()})} className="h-12 rounded-xl text-center font-black uppercase" />
               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">النوع</label>
                  <select className="w-full h-12 border border-gray-200 rounded-xl px-4 text-xs font-bold bg-white outline-none" value={currentCoupon.discount_type} onChange={e => setCurrentCoupon({...currentCoupon, discount_type: e.target.value as any})}>
                     <option value="percentage">نسبة مئوية (%)</option>
                     <option value="fixed">مبلغ ثابت (SAR)</option>
                  </select>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <Input label="القيمة" type="number" value={currentCoupon.discount_value || ''} onChange={e => setCurrentCoupon({...currentCoupon, discount_value: Number(e.target.value)})} className="h-12 rounded-xl font-bold" />
               <Input label="تاريخ الانتهاء" type="date" value={currentCoupon.end_date || ''} onChange={e => setCurrentCoupon({...currentCoupon, end_date: e.target.value})} className="h-12 rounded-xl font-bold" />
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                <p className="text-[10px] font-black text-gray-400 uppercase">تخصيص الخصم (اختياري)</p>
                
                {halls.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold text-purple-600 flex gap-1"><Building2 className="w-3 h-3" /> القاعات</p>
                        {halls.map(h => (
                            <button key={h.id} onClick={() => toggleTarget(h.id)} className={`w-full text-right px-3 py-2 rounded-xl text-[10px] font-bold border transition-all flex justify-between ${currentCoupon.target_ids?.includes(h.id) ? 'bg-white border-primary text-primary shadow-sm' : 'border-transparent hover:bg-white'}`}>
                                {h.name} {currentCoupon.target_ids?.includes(h.id) && <CheckCircle2 className="w-3 h-3" />}
                            </button>
                        ))}
                    </div>
                )}
                {chalets.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold text-blue-600 flex gap-1"><Palmtree className="w-3 h-3" /> الشاليهات</p>
                        {chalets.map(c => (
                            <button key={c.id} onClick={() => toggleTarget(c.id)} className={`w-full text-right px-3 py-2 rounded-xl text-[10px] font-bold border transition-all flex justify-between ${currentCoupon.target_ids?.includes(c.id) ? 'bg-white border-primary text-primary shadow-sm' : 'border-transparent hover:bg-white'}`}>
                                {c.name} {currentCoupon.target_ids?.includes(c.id) && <CheckCircle2 className="w-3 h-3" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <Button onClick={handleSave} className="w-full h-12 rounded-xl font-black text-lg shadow-lg shadow-primary/20">حفظ وتفعيل</Button>
         </div>
      </Modal>
    </div>
  );
};
