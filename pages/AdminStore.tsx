
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, POSItem, POS_CATEGORIES } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { Modal } from '../components/ui/Modal';
import { 
  Plus, Trash2, Package, Search, 
  Loader2, Edit3, AlertTriangle, Store, Tag
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const AdminStore: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [items, setItems] = useState<POSItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<POSItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<POSItem>>({ category: 'عام' });
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  const fetchItems = async () => {
    setLoading(true);
    // Fetch items where vendor_id is the admin's ID
    const { data } = await supabase.from('pos_items').select('*').eq('vendor_id', user.id).order('created_at', { ascending: false });
    setItems(data || []);
    setFilteredItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [user.id]);

  useEffect(() => {
    let res = items;
    if (selectedCategory !== 'الكل') {
      res = res.filter(i => i.category === selectedCategory);
    }
    if (searchQuery) {
      res = res.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    setFilteredItems(res);
  }, [searchQuery, selectedCategory, items]);

  const handleSaveItem = async () => {
    if (!currentItem.name || !currentItem.price) return;
    setSaving(true);
    const payload = {
      ...currentItem,
      vendor_id: user.id,
      hall_id: user.id, // Using User ID as Hall ID placeholder for Admin items or create a dummy hall
      price: Number(currentItem.price),
      stock: Number(currentItem.stock || 0),
      category: currentItem.category || 'عام'
    };
    
    // Ensure we have a hall_id constraint satisfied if schema requires it. 
    // Usually Admin doesn't have halls in same way, so we might need a dummy hall or make hall_id nullable in schema.
    // Assuming hall_id is required, let's fetch any hall owned by admin or insert one if needed.
    // For now, let's try inserting. If it fails due to hall_id FK, we need to fix schema or create a placeholder hall.
    
    // Quick Fix: Create a "Store Warehouse" hall for Admin if not exists
    let hallId = currentItem.hall_id;
    if (!hallId) {
        const { data: hData } = await supabase.from('halls').select('id').eq('vendor_id', user.id).eq('name', 'المخزون الرئيسي').maybeSingle();
        if (hData) {
            hallId = hData.id;
        } else {
            const { data: newHall } = await supabase.from('halls').insert([{ 
                vendor_id: user.id, name: 'المخزون الرئيسي', city: 'الرياض', price_per_night: 0, capacity: 0 
            }]).select().single();
            hallId = newHall?.id;
        }
    }
    payload.hall_id = hallId!;

    const { error } = currentItem.id 
      ? await supabase.from('pos_items').update(payload).eq('id', currentItem.id)
      : await supabase.from('pos_items').insert([payload]);

    if (!error) {
      toast({ title: 'تم الحفظ', variant: 'success' });
      setIsItemModalOpen(false);
      setCurrentItem({ category: 'عام' });
      fetchItems();
    } else {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDeleteItem = async (id: string) => {
      if(!confirm('هل أنت متأكد من حذف المنتج؟')) return;
      await supabase.from('pos_items').delete().eq('id', id);
      fetchItems();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm gap-4">
         <div>
            <h2 className="text-3xl font-black text-primary flex items-center gap-2">
                <Store className="w-8 h-8" /> إدارة متجر المنصة
            </h2>
            <p className="text-sm text-gray-400 font-bold mt-1">المنتجات المعروضة للبيع للبائعين والزوار.</p>
         </div>
         <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
               <input 
                 className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-10 text-right font-bold outline-none focus:ring-1 focus:ring-primary/20"
                 placeholder="بحث عن منتج..."
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
               />
               <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
            <Button onClick={() => { setCurrentItem({ category: 'عام', stock: 100 }); setIsItemModalOpen(true); }} className="h-12 px-6 rounded-xl font-bold gap-2 shadow-lg shadow-primary/20">
               <Plus className="w-5 h-5" /> منتج جديد
            </Button>
         </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button onClick={() => setSelectedCategory('الكل')} className={`px-5 py-2 rounded-xl font-bold whitespace-nowrap transition-all border ${selectedCategory === 'الكل' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}>الكل</button>
        {POS_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2 rounded-xl font-bold whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}>{cat}</button>
        ))}
      </div>

      {/* Inventory Grid */}
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 overflow-hidden">
         <table className="w-full text-right border-separate border-spacing-y-2">
             <thead className="text-gray-400 font-bold text-[10px] uppercase">
                 <tr>
                     <th className="px-4 pb-2">اسم المنتج</th>
                     <th className="px-4 pb-2">التصنيف</th>
                     <th className="px-4 pb-2">السعر</th>
                     <th className="px-4 pb-2">المخزون</th>
                     <th className="px-4 pb-2 text-center">إجراءات</th>
                 </tr>
             </thead>
             <tbody>
                 {loading ? (
                    <tr><td colSpan={5} className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
                 ) : filteredItems.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-gray-400 font-bold">لا توجد منتجات. أضف أول منتج!</td></tr>
                 ) : filteredItems.map(item => (
                     <tr key={item.id} className="bg-gray-50/50 hover:bg-white transition-all group">
                         <td className="p-4 rounded-r-2xl font-bold text-gray-900 border-y border-r border-transparent group-hover:border-gray-100 flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center text-primary"><Package className="w-5 h-5" /></div>
                             {item.name}
                         </td>
                         <td className="p-4 text-sm text-gray-500 border-y border-transparent group-hover:border-gray-100"><span className="bg-white border px-2 py-1 rounded-lg text-xs font-bold">{item.category}</span></td>
                         <td className="p-4 border-y border-transparent group-hover:border-gray-100"><PriceTag amount={item.price} className="font-bold text-gray-800" /></td>
                         <td className="p-4 font-black text-lg text-gray-800 border-y border-transparent group-hover:border-gray-100">
                             <div className="flex items-center gap-2">
                                {item.stock}
                                {item.stock < 10 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                             </div>
                         </td>
                         <td className="p-4 text-center rounded-l-2xl border-y border-l border-transparent group-hover:border-gray-100">
                             <div className="flex justify-center gap-2">
                                 <button onClick={() => { setCurrentItem(item); setIsItemModalOpen(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"><Edit3 className="w-4 h-4" /></button>
                                 <button onClick={() => handleDeleteItem(item.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                             </div>
                         </td>
                     </tr>
                 ))}
             </tbody>
         </table>
      </div>

      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title={currentItem.id ? 'تعديل المنتج' : 'إضافة منتج للمتجر'}>
         <div className="space-y-4 text-right">
            <Input label="اسم الصنف" value={currentItem.name || ''} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} className="h-12 rounded-xl" />
            <div className="grid grid-cols-2 gap-4">
               <Input label="السعر" type="number" value={currentItem.price || ''} onChange={e => setCurrentItem({...currentItem, price: Number(e.target.value)})} className="h-12 rounded-xl" />
               <Input label="الكمية (المخزون)" type="number" value={currentItem.stock || ''} onChange={e => setCurrentItem({...currentItem, stock: Number(e.target.value)})} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">التصنيف</label>
                <select className="w-full h-12 border border-gray-200 rounded-xl px-4 font-bold bg-white focus:ring-2 focus:ring-primary/10 outline-none" value={currentItem.category} onChange={e => setCurrentItem({...currentItem, category: e.target.value})}>
                    {POS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <Button onClick={handleSaveItem} disabled={saving} className="w-full h-14 rounded-xl font-black mt-4">
                {saving ? <Loader2 className="animate-spin" /> : 'حفظ البيانات'}
            </Button>
         </div>
      </Modal>
    </div>
  );
};
