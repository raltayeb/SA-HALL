
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, POSItem, Hall } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { Modal } from '../components/ui/Modal';
import { ShoppingCart, Plus, Minus, Trash2, Package, Search, PlusCircle, Building2, Loader2, Receipt } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const VendorPOS: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [items, setItems] = useState<POSItem[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [selectedHallId, setSelectedHallId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<POSItem>>({});
  const [cart, setCart] = useState<{item: POSItem, qty: number}[]>([]);
  const { toast } = useToast();

  const fetchHalls = useCallback(async () => {
    try {
      const { data: hData, error } = await supabase
        .from('halls')
        .select('*')
        .eq('vendor_id', user.id);
      
      if (error) throw error;
      setHalls(hData || []);
      if (hData?.[0] && !selectedHallId) {
        setSelectedHallId(hData[0].id);
      }
    } catch (err) {
      console.error("Fetch Halls Error:", err);
    }
  }, [user.id]);

  const fetchItems = useCallback(async () => {
    if (!selectedHallId || !user.id) return;
    setLoading(true);
    try {
      const { data: iData, error } = await supabase
        .from('pos_items')
        .select('*')
        .eq('hall_id', selectedHallId)
        .eq('vendor_id', user.id);
      
      if (error) throw error;
      setItems(iData || []);
    } catch (err: any) {
      console.error("Fetch Items Error:", err);
      // In case table is missing, don't crash UI
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user.id, selectedHallId]);

  useEffect(() => { fetchHalls(); }, [fetchHalls]);
  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSaveItem = async () => {
    if (!currentItem.name || !currentItem.price || !selectedHallId) {
      toast({ title: 'تنبيه', description: 'يرجى إكمال بيانات الصنف.', variant: 'destructive' });
      return;
    }
    const payload = { 
      name: currentItem.name,
      price: Number(currentItem.price),
      stock: Number(currentItem.stock || 0),
      vendor_id: user.id, 
      hall_id: selectedHallId 
    };

    const { error } = currentItem.id 
      ? await supabase.from('pos_items').update(payload).eq('id', currentItem.id)
      : await supabase.from('pos_items').insert([payload]);

    if (!error) {
      toast({ title: 'تمت الإضافة', variant: 'success' });
      setIsModalOpen(false);
      setCurrentItem({});
      fetchItems();
    } else {
      toast({ title: 'خطأ في قاعدة البيانات', description: error.message, variant: 'destructive' });
    }
  };

  const addToCart = (item: POSItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) return prev.map(i => i.item.id === item.id ? {...i, qty: i.qty + 1} : i);
      return [...prev, {item, qty: 1}];
    });
  };

  const total = cart.reduce((sum, i) => sum + (Number(i.item.price) * i.qty), 0);

  return (
    <div className="space-y-8 text-right pb-20">
      <div className="flex flex-col md:flex-row-reverse justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-ruqaa text-primary">نظام المبيعات السريع (POS)</h2>
          <p className="text-sm text-muted-foreground mt-1">إدارة مبيعات المستلزمات الإضافية داخل القاعة.</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm ml-auto md:ml-0">
          <select 
            className="bg-transparent border-none text-sm font-black focus:ring-0 outline-none min-w-[150px] text-right appearance-none"
            value={selectedHallId} onChange={e => setSelectedHallId(e.target.value)}
          >
            <option value="" disabled>اختر القاعة</option>
            {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <Building2 className="w-5 h-5 text-primary ml-2" />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center flex-row-reverse">
             <h3 className="font-black text-xl flex items-center gap-2">المخزون المتوفر <Package className="w-5 h-5 text-primary" /></h3>
             <Button onClick={() => { setCurrentItem({ stock: 0 }); setIsModalOpen(true); }} className="rounded-xl font-bold h-10 gap-2">
                إضافة صنف جديد <PlusCircle className="w-4 h-4" />
             </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
             {loading ? (
               Array.from({length: 6}).map((_, i) => <div key={i} className="aspect-square bg-gray-50 animate-pulse rounded-[2rem] border border-gray-100"></div>)
             ) : items.length === 0 ? (
               <div className="col-span-full py-24 text-center border-2 border-dashed rounded-[3rem] opacity-30 flex flex-col items-center gap-4">
                  <Package className="w-12 h-12" />
                  <p className="font-black">لا توجد أصناف مضافة حالياً لهذه القاعة.</p>
               </div>
             ) : items.map(item => (
               <div key={item.id} onClick={() => addToCart(item)} className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden">
                  <div className="text-[10px] font-black text-primary bg-primary/5 px-4 py-1 rounded-full inline-block mb-4">مخزون: {item.stock}</div>
                  <h4 className="font-black text-xl text-gray-900 group-hover:text-primary transition-colors">{item.name}</h4>
                  <PriceTag amount={item.price} className="text-2xl mt-2" />
                  <div className="absolute -bottom-4 -left-4 opacity-0 group-hover:opacity-10 transition-opacity">
                     <ShoppingCart className="w-24 h-24 text-primary" />
                  </div>
               </div>
             ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-[3rem] p-10 shadow-2xl sticky top-24 space-y-8 ring-1 ring-black/5">
             <h3 className="text-xl font-black border-b pb-6 flex items-center justify-end gap-2 text-gray-900">سلة المبيعات <Receipt className="w-5 h-5 text-primary" /></h3>
             <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
                {cart.length === 0 ? (
                  <div className="text-center text-gray-400 py-16 space-y-3">
                     <ShoppingCart className="w-10 h-10 mx-auto opacity-10" />
                     <p className="text-xs font-bold italic">السلة فارغة، ابدأ بإضافة أصناف</p>
                  </div>
                ) : cart.map((c, i) => (
                  <div key={i} className="flex items-center justify-between flex-row-reverse border-b border-dashed border-gray-100 pb-4 last:border-0">
                     <div className="text-right">
                        <p className="font-black text-sm text-gray-900">{c.item.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold">{c.qty} وحدة × {c.item.price} SAR</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <button onClick={() => setCart(cart.filter(x => x.item.id !== c.item.id))} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                        <PriceTag amount={c.item.price * c.qty} className="text-sm font-black text-gray-900" />
                     </div>
                  </div>
                ))}
             </div>
             <div className="pt-8 border-t border-gray-100 space-y-8">
                <div className="flex justify-between items-center flex-row-reverse">
                   <span className="font-black text-gray-400 uppercase text-[10px] tracking-widest">المجموع النهائي</span>
                   <PriceTag amount={total} className="text-5xl text-primary" iconSize={32} />
                </div>
                <Button disabled={cart.length === 0} className="w-full h-18 rounded-[1.5rem] font-black text-xl shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-transform">تأكيد البيع وطباعة</Button>
             </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة صنف جديد للمخزون">
         <div className="space-y-6 text-right p-2">
            <Input label="اسم الصنف" placeholder="مثال: مياه معدنية 330 مل" value={currentItem.name || ''} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} className="h-14 rounded-2xl text-right font-bold text-lg" />
            <div className="grid grid-cols-2 gap-6">
               <Input label="سعر البيع (SAR)" type="number" placeholder="0.00" value={currentItem.price || ''} onChange={e => setCurrentItem({...currentItem, price: Number(e.target.value)})} className="h-14 rounded-2xl text-right font-bold" />
               <Input label="الكمية الحالية" type="number" placeholder="0" value={currentItem.stock || ''} onChange={e => setCurrentItem({...currentItem, stock: Number(e.target.value)})} className="h-14 rounded-2xl text-right font-bold" />
            </div>
            <div className="pt-4">
              <Button onClick={handleSaveItem} className="w-full h-16 rounded-2xl font-black text-xl shadow-xl shadow-primary/20">حفظ في قاعدة البيانات</Button>
            </div>
         </div>
      </Modal>
    </div>
  );
};
