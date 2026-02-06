
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Coupon, Hall, Service, POSItem } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Ticket, Plus, Tag, Calendar, Trash2, CheckCircle2, Building2, Sparkles, Package, Search, Loader2, Info } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const VendorCoupons: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [posItems, setPosItems] = useState<POSItem[]>([]);
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
    if (!user?.id) return;
    setLoading(true);
    try {
      const [couponsRes, hallsRes, servicesRes, posRes] = await Promise.all([
        supabase.from('coupons').select('*').eq('vendor_id', user.id).order('created_at', { ascending: false }),
        supabase.from('halls').select('id, name').eq('vendor_id', user.id),
        supabase.from('services').select('id, name').eq('vendor_id', user.id),
        supabase.from('pos_items').select('id, name').eq('vendor_id', user.id)
      ]);
      
      if (couponsRes.data) setCoupons(couponsRes.data as Coupon[]);
      if (hallsRes.data) setHalls(hallsRes.data as Hall[]);
      if (servicesRes.data) setServices(servicesRes.data as Service[]);
      if (posRes.data) setPosItems(posRes.data as POSItem[]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
      toast({ title: 'خطأ', description: 'يرجى إكمال بيانات الكوبون الأساسية.', variant: 'destructive' });
      return;
    }
    const payload = { ...currentCoupon, vendor_id: user.id };
    const { error } = currentCoupon.id 
      ? await supabase.from('coupons').update(payload).eq('id', currentCoupon.id)
      : await supabase.from('coupons').insert([payload]);

    if (!error) {
      toast({ title: 'تم الحفظ بنجاح', variant: 'success' });
      setIsModalOpen(false);
      setCurrentCoupon({ discount_type: 'percentage', applicable_to: 'both', target_ids: [], is_active: true, start_date: new Date().toISOString().split('T')[0] });
      fetchData();
    } else {
      toast({ title: 'خطأ في الحفظ', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8 text-right pb-10">
      <div className="flex justify-between items-center flex-row-reverse bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-primary flex items-center gap-3 justify-end">
             إدارة الخصومات <Ticket className="w-8 h-8" />
          </h2>
          <p className="text-sm text-muted-foreground mt-1 font-bold">حدد العناصر التي ترغب في تطبيق الخصم عليها لزيادة مبيعاتك.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="h-12 px-8 rounded-2xl font-black gap-2 shadow-xl shadow-primary/20">
           إضافة كوبون جديد <Plus className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({length: 3}).map((_, i) => <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-[2.5rem]"></div>)
        ) : coupons.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[2.5rem] opacity-40 font-bold bg-white">
            <Tag className="w-12 h-12 mx-auto mb-4" />
            لا توجد عروض ترويجية نشطة حالياً.
          </div>
        ) : coupons.map(c => (
          <div key={c.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
             <div className="flex justify-between items-start mb-6 flex-row-reverse">
                <div className="bg-primary/5 p-3 rounded-2xl text-primary"><Tag className="w-6 h-6" /></div>
                <Badge variant={c.is_active ? 'success' : 'destructive'} className="rounded-xl px-4">{c.is_active ? 'نشط' : 'متوقف'}</Badge>
             </div>
             <div className="space-y-2">
                <h4 className="text-3xl font-black text-gray-900 tracking-wider font-mono">{c.code}</h4>
                <p className="text-sm font-black text-primary">
                  {c.discount_type === 'percentage' ? `خصم ${c.discount_value}%` : `خصم ثابت ${c.discount_value} ر.س`}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-[10px] font-bold text-gray-400">ينطبق على: </span>
                    <span className="text-[10px] font-black text-gray-600 bg-gray-50 px-2 py-0.5 rounded-lg border">
                        {c.target_ids?.length ? `${c.target_ids.length} عناصر محددة` : 'كافة الأصول'}
                    </span>
                </div>
             </div>
             <div className="mt-6 flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest border-t pt-4">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> ينتهي: {c.end_date}</span>
                <button className="text-red-400 hover:text-red-600 transition-colors" onClick={async () => {
                  if(confirm('حذف الكوبون؟')) {
                    await supabase.from('coupons').delete().eq('id', c.id);
                    fetchData();
                  }
                }}><Trash2 className="w-4 h-4" /></button>
             </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إعداد كوبون خصم مخصص" className="max-w-2xl">
         <div className="space-y-6 text-right">
            <div className="grid grid-cols-2 gap-4">
               <Input label="رمز الكوبون (مثال: OFFER20)" placeholder="OFFER20" value={currentCoupon.code || ''} onChange={e => setCurrentCoupon({...currentCoupon, code: e.target.value.toUpperCase()})} className="h-12 rounded-xl text-right font-black" />
               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">نوع الخصم</label>
                  <select className="w-full h-12 border rounded-xl px-4 text-sm font-bold bg-gray-50 outline-none" value={currentCoupon.discount_type} onChange={e => setCurrentCoupon({...currentCoupon, discount_type: e.target.value as any})}>
                     <option value="percentage">نسبة مئوية (%)</option>
                     <option value="fixed">مبلغ ثابت (SAR)</option>
                  </select>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <Input label="قيمة الخصم" type="number" value={currentCoupon.discount_value || ''} onChange={e => setCurrentCoupon({...currentCoupon, discount_value: Number(e.target.value)})} className="h-12 rounded-xl text-right font-bold" />
               <Input label="تاريخ الانتهاء" type="date" value={currentCoupon.end_date || ''} onChange={e => setCurrentCoupon({...currentCoupon, end_date: e.target.value})} className="h-12 rounded-xl font-bold" />
            </div>

            {/* Targeted Asset Selection */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">
                    <Info className="w-4 h-4" /> اختر العناصر المشمولة بالخصم (اترك فارغاً للجميع)
                </div>
                
                <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                    {/* Halls */}
                    {halls.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-primary flex items-center gap-1"><Building2 className="w-3 h-3" /> القاعات</p>
                            <div className="grid grid-cols-2 gap-2">
                                {halls.map(h => (
                                    <button 
                                        key={h.id} 
                                        onClick={() => toggleTarget(h.id)}
                                        className={`flex items-center gap-2 p-3 rounded-xl border text-[10px] font-bold transition-all text-right ${currentCoupon.target_ids?.includes(h.id) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white border-gray-100 text-gray-500 hover:border-primary/20'}`}
                                    >
                                        <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center ${currentCoupon.target_ids?.includes(h.id) ? 'bg-white text-primary' : 'bg-gray-100'}`}>
                                            {currentCoupon.target_ids?.includes(h.id) && <CheckCircle2 className="w-3 h-3" />}
                                        </div>
                                        <span className="truncate">{h.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Services */}
                    {services.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-purple-600 flex items-center gap-1"><Sparkles className="w-3 h-3" /> الخدمات</p>
                            <div className="grid grid-cols-2 gap-2">
                                {services.map(s => (
                                    <button 
                                        key={s.id} 
                                        onClick={() => toggleTarget(s.id)}
                                        className={`flex items-center gap-2 p-3 rounded-xl border text-[10px] font-bold transition-all text-right ${currentCoupon.target_ids?.includes(s.id) ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white border-gray-100 text-gray-500 hover:border-purple-200'}`}
                                    >
                                        <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center ${currentCoupon.target_ids?.includes(s.id) ? 'bg-white text-purple-600' : 'bg-gray-100'}`}>
                                            {currentCoupon.target_ids?.includes(s.id) && <CheckCircle2 className="w-3 h-3" />}
                                        </div>
                                        <span className="truncate">{s.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Store Items */}
                    {posItems.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-emerald-600 flex items-center gap-1"><Package className="w-3 h-3" /> منتجات المتجر</p>
                            <div className="grid grid-cols-2 gap-2">
                                {posItems.map(item => (
                                    <button 
                                        key={item.id} 
                                        onClick={() => toggleTarget(item.id)}
                                        className={`flex items-center gap-2 p-3 rounded-xl border text-[10px] font-bold transition-all text-right ${currentCoupon.target_ids?.includes(item.id) ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white border-gray-100 text-gray-500 hover:border-emerald-200'}`}
                                    >
                                        <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center ${currentCoupon.target_ids?.includes(item.id) ? 'bg-white text-emerald-600' : 'bg-gray-100'}`}>
                                            {currentCoupon.target_ids?.includes(item.id) && <CheckCircle2 className="w-3 h-3" />}
                                        </div>
                                        <span className="truncate">{item.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Button onClick={handleSave} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20">تفعيل نظام الخصم</Button>
         </div>
      </Modal>
    </div>
  );
};
