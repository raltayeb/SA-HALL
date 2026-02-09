
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, POSItem } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { ShoppingCart, Package, Search, Plus, Minus, Store, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const VendorMarketplace: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [items, setItems] = useState<POSItem[]>([]);
  const [cart, setCart] = useState<{item: POSItem, qty: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStore = async () => {
      setLoading(true);
      // Find Super Admin ID first
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'super_admin').limit(1);
      
      if (admins && admins.length > 0) {
          const adminId = admins[0].id;
          // Fetch items owned by super admin
          const { data } = await supabase.from('pos_items')
            .select('*')
            .eq('vendor_id', adminId)
            .gt('stock', 0);
          
          setItems(data as any[] || []);
      }
      setLoading(false);
    };
    fetchStore();
  }, []);

  const addToCart = (item: POSItem) => {
    setCart(prev => {
        const exists = prev.find(i => i.item.id === item.id);
        if (exists) return prev.map(i => i.item.id === item.id ? { ...i, qty: Math.min(i.qty + 1, item.stock) } : i);
        return [...prev, { item, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
        const exists = prev.find(i => i.item.id === id);
        if (exists && exists.qty > 1) return prev.map(i => i.item.id === id ? { ...i, qty: i.qty - 1 } : i);
        return prev.filter(i => i.item.id !== id);
    });
  };

  const submitOrder = async () => {
    setSubmitting(true);
    try {
        const total = cart.reduce((sum, i) => sum + (i.item.price * i.qty), 0);
        const orderItems = cart.map(c => ({
            product_id: c.item.id,
            name: c.item.name,
            price: Number(c.item.price),
            qty: c.qty
        }));

        const { error } = await supabase.from('store_orders').insert([{
            vendor_id: user.id,
            items: orderItems,
            total_amount: total,
            status: 'pending'
        }]);

        if (error) throw error;

        // Notify Admin (Assume first admin found)
        const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'super_admin').limit(1);
        if(admins?.[0]) {
            await supabase.from('notifications').insert([{
                user_id: admins[0].id,
                title: 'طلب جديد من المتجر 📦',
                message: `طلب شراء جديد من ${user.business_name} بقيمة ${total} ر.س`,
                type: 'system'
            }]);
        }

        toast({ title: 'تم إرسال الطلب', description: 'سيتم التواصل معك لتأكيد التوصيل.', variant: 'success' });
        setCart([]);
    } catch (err: any) {
        toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
        setSubmitting(false);
    }
  };

  const total = cart.reduce((sum, i) => sum + (i.item.price * i.qty), 0);

  return (
    <div className="space-y-8 animate-in fade-in pb-20 font-tajawal text-right">
       <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
             <h2 className="text-3xl font-black text-primary flex items-center gap-2">
                <Store className="w-8 h-8" /> متجر المنصة
             </h2>
             <p className="text-sm text-gray-400 font-bold mt-1">تجهيزات ومعدات بأفضل الأسعار لشركائنا.</p>
          </div>
          <div className="bg-gray-50 px-6 py-4 rounded-2xl border border-gray-100 flex items-center gap-6 w-full md:w-auto justify-between">
             <div className="flex items-center gap-3">
                <ShoppingCart className="w-6 h-6 text-gray-400" />
                <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">المجموع</p>
                    <PriceTag amount={total} className="text-xl font-black text-primary" />
                </div>
             </div>
             {cart.length > 0 && (
                <Button onClick={submitOrder} disabled={submitting} className="h-12 px-6 rounded-xl font-black shadow-lg shadow-primary/20">
                    {submitting ? <Loader2 className="animate-spin" /> : 'إرسال الطلب'}
                </Button>
             )}
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? Array.from({length: 4}).map((_, i) => <div key={i} className="aspect-[4/3] bg-gray-100 rounded-[2rem] animate-pulse"></div>) : items.map(item => {
             const inCart = cart.find(c => c.item.id === item.id);
             return (
                <div key={item.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 hover:shadow-xl hover:border-primary/20 transition-all group relative overflow-hidden flex flex-col">
                   <div className="aspect-square bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-gray-300 group-hover:bg-primary/5 group-hover:text-primary transition-colors relative">
                      {item.image_url ? (
                          <img src={item.image_url} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                          <Package className="w-12 h-12" />
                      )}
                   </div>
                   <h3 className="font-black text-gray-900 mb-1 truncate text-lg">{item.name}</h3>
                   <div className="flex justify-between items-end mb-4">
                      <PriceTag amount={item.price} className="text-xl font-black text-primary" />
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">{item.stock} متوفر</span>
                   </div>
                   
                   <div className="mt-auto pt-4 border-t border-gray-50">
                      {inCart ? (
                         <div className="flex items-center gap-2 w-full justify-between bg-gray-50 p-1 rounded-xl">
                            <button onClick={() => removeFromCart(item.id)} className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm hover:text-red-500 transition-colors"><Minus className="w-4 h-4" /></button>
                            <span className="font-black text-lg">{inCart.qty}</span>
                            <button onClick={() => addToCart(item)} className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm hover:text-green-500 transition-colors"><Plus className="w-4 h-4" /></button>
                         </div>
                      ) : (
                         <Button onClick={() => addToCart(item)} className="w-full h-12 rounded-xl font-bold shadow-none bg-gray-900 text-white hover:bg-black">إضافة للسلة</Button>
                      )}
                   </div>
                </div>
             );
          })}
       </div>
    </div>
  );
};
