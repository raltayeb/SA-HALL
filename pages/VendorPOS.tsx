
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, POSItem, Hall } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { Modal } from '../components/ui/Modal';
import { ShoppingCart, Plus, Minus, Trash2, Package, Search, PlusCircle, Building2, Loader2, Inventory, Receipt } from 'lucide-react';
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: hData } = await supabase.from('halls').select('*').eq('vendor_id', user.id);
    setHalls(hData || []);
    if (hData?.[0] && !selectedHallId) setSelectedHallId(hData[0].id);

    if (selectedHallId) {
      const { data: iData } = await supabase.from('pos_items').select('*').eq('hall_id', selectedHallId);
      setItems(iData || []);
    }
    setLoading(false);
  }, [user.id, selectedHallId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveItem = async () => {
    if (!currentItem.name || !currentItem.price || !selectedHallId) return;
    const payload = { ...currentItem, vendor_id: user.id, hall_id: selectedHallId };
    const { error } = currentItem.id 
      ? await supabase.from('pos_items').update(payload).eq('id', currentItem.id)
      : await supabase.from('pos_items').insert([payload]);

    if (!error) {
      toast({ title: 'تم الحفظ', variant: 'success' });
      setIsModalOpen(false);
      fetchData();
    }
  };

  const addToCart = (item: POSItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) return prev.map(i => i.item.id === item.id ? {...i, qty: i.qty + 1} : i);
      return [...prev, {item, qty: 1}];
    });
  };

  const total = cart.reduce((sum, i) => sum + (i.item.price * i.qty), 0);

  return (
    <div className="space-y-8 text-right pb-20">
      <div className="flex flex-col md:flex-row-reverse justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-ruqaa text-primary">نظام المبيعات (POS)</h2>
          <p className="text-sm text-muted-foreground mt-1">بيع مستلزمات الحفلات (مياه، سناكس، إلخ) مباشرة من القاعة.</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm ml-auto md:ml-0">
          <select 
            className="bg-transparent border-none text-sm font-black focus:ring-0 outline-none min-w-[150px] text-right appearance-none"
            value={selectedHallId} onChange={e => setSelectedHallId(e.target.value)}
          >
            {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <Building2 className="w-5 h-5 text-primary ml-2" />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Inventory Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center flex-row-reverse">
             <h3 className="font-black text-xl flex items-center gap-2">المخزون المتوفر <Package className="w-5 h-5 text-primary" /></h3>
             <Button onClick={() => { setCurrentItem({ stock: 0 }); setIsModalOpen(true); }} className="rounded-xl font-bold h-10 gap-2">
                إضافة صنف <PlusCircle className="w-4 h-4" />
             </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
             {loading ? (
               Array.from({length: 3}).map((_, i) => <div key={i} className="aspect-square bg-gray-100 animate-pulse rounded-3xl"></div>)
             ) : items.length === 0 ? (
               <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl opacity-50 font-bold">لا توجد أصناف مضافة لهذه القاعة.</div>
             ) : items.map(item => (
               <div key={item.id} onClick={() => addToCart(item)} className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden">
                  <div className="text-xs font-black text-primary bg-primary/5 px-3 py-1 rounded-lg inline-block mb-3">مخزون: {item.stock}</div>
                  <h4 className="font-black text-lg text-gray-900 group-hover:text-primary transition-colors">{item.name}</h4>
                  <PriceTag amount={item.price} className="text-xl mt-2" />
                  <div className="absolute -bottom-2 -left-2 opacity-0 group-hover:opacity-10 transition-opacity">
                     <ShoppingCart className="w-20 h-20 text-primary" />
                  </div>
               </div>
             ))}
          </div>
        </div>

        {/* Cart / Checkout Section */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-xl sticky top-24 space-y-8 ring-1 ring-black/5">
             <h3 className="text-xl font-black border-b pb-4 flex items-center justify-end gap-2">فاتورة البيع <Receipt className="w-5 h-5 text-primary" /></h3>
             <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                {cart.length === 0 ? (
                  <p className="text-center text-gray-400 py-10 italic">السلة فارغة</p>
                ) : cart.map((c, i) => (
                  <div key={i} className="flex items-center justify-between flex-row-reverse border-b border-dashed pb-3 last:border-0">
                     <div className="text-right">
                        <p className="font-black text-sm">{c.item.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold">{c.qty} × {c.item.price} SAR</p>
                     </div>
                     <div className="flex items-center gap-2">
                        <button onClick={() => setCart(cart.filter(x => x.item.id !== c.item.id))} className="text-red-500 hover:bg-red-50 p-1 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                        <PriceTag amount={c.item.price * c.qty} className="text-sm font-black" />
                     </div>
                  </div>
                ))}
             </div>
             <div className="pt-6 border-t space-y-6">
                <div className="flex justify-between items-center flex-row-reverse">
                   <span className="font-black text-gray-400 uppercase text-xs tracking-widest">الإجمالي النهائي</span>
                   <PriceTag amount={total} className="text-4xl text-primary" iconSize={28} />
                </div>
                <Button disabled={cart.length === 0} className="w-full h-16 rounded-2xl font-black text-xl shadow-xl shadow-primary/20">تأكيد البيع وطباعة</Button>
             </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة صنف للمخزون">
         <div className="space-y-6 text-right">
            <Input label="اسم الصنف" value={currentItem.name || ''} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} className="h-12 rounded-xl text-right font-bold" />
            <div className="grid grid-cols-2 gap-4">
               <Input label="السعر (SAR)" type="number" value={currentItem.price || ''} onChange={e => setCurrentItem({...currentItem, price: Number(e.target.value)})} className="h-12 rounded-xl text-right font-bold" />
               <Input label="الكمية المتوفرة" type="number" value={currentItem.stock || ''} onChange={e => setCurrentItem({...currentItem, stock: Number(e.target.value)})} className="h-12 rounded-xl text-right font-bold" />
            </div>
            <Button onClick={handleSaveItem} className="w-full h-14 rounded-xl font-black text-lg shadow-lg shadow-primary/20">حفظ في المخزون</Button>
         </div>
      </Modal>
    </div>
  );
};
