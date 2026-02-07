
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, POSItem } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { ShoppingCart, Package, Search, Plus, Minus, CheckCircle2, Store } from 'lucide-react';
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
      // Fetch items from Super Admin
      const { data } = await supabase.from('pos_items')
        .select('*, vendor:vendor_id!inner(role)')
        .eq('vendor.role', 'super_admin')
        .gt('stock', 0); // Only available items
      
      setItems(data as any[] || []);
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

        // Notify Admin (Optional logic here or via trigger)
        await supabase.from('notifications').insert([{
            user_id: cart[0].item.vendor_id, // Admin ID
            title: 'طلب جديد من المتجر',
            message: `طلب شراء جديد من ${user.business_name} بقيمة ${total} ر.س`,
            type: 'system'
        }]);

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
    <div className="space-y-8 animate-in fade-in pb-20">
       <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex justify-between items-center">
          <div>
             <h2 className="text-3xl font-black text-primary flex items-center gap-2">
                <Store className="w-8 h-8" /> متجر المنصة
             </h2>
             <p className="text-sm text-gray-400 font-bold mt-1">تجهيزات ومعدات بأفضل الأسعار لشركائنا.</p>
          </div>
          <div className="bg-gray-50 px-6 py-3 rounded-2xl border flex items-center gap-4">
             <ShoppingCart className="w-5 h-5 text-gray-400" />
             <div className="text-left">
                <p className="text-[10px] font-black text-gray-400 uppercase">سلة المشتريات</p>
                <PriceTag amount={total} className="text-lg font-black text-primary" />
             </div>
             {cart.length > 0 && <Button onClick={submitOrder} disabled={submitting} size="sm" className="h-10 px-4 rounded-xl font-bold">إرسال الطلب</Button>}
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? Array.from({length: 4}).map((_, i) => <div key={i} className="aspect-[4/3] bg-gray-100 rounded-[2rem] animate-pulse"></div>) : items.map(item => {
             const inCart = cart.find(c => c.item.id === item.id);
             return (
                <div key={item.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 hover:shadow-xl transition-all group relative overflow-hidden">
                   <div className="aspect-square bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-gray-300 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                      <Package className="w-12 h-12" />
                   </div>
                   <h3 className="font-bold text-gray-900 mb-1 truncate">{item.name}</h3>
                   <div className="flex justify-between items-end">
                      <PriceTag amount={item.price} className="text-xl font-black text-primary" />
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{item.stock} متوفر</span>
                   </div>
                   
                   <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                      {inCart ? (
                         <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-1 w-full justify-between">
                            <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm hover:text-red-500 transition-colors"><Minus className="w-4 h-4" /></button>
                            <span className="font-black text-sm">{inCart.qty}</span>
                            <button onClick={() => addToCart(item)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm hover:text-green-500 transition-colors"><Plus className="w-4 h-4" /></button>
                         </div>
                      ) : (
                         <Button onClick={() => addToCart(item)} className="w-full h-10 rounded-xl font-bold shadow-none bg-gray-900 text-white">إضافة للسلة</Button>
                      )}
                   </div>
                </div>
             );
          })}
       </div>
    </div>
  );
};
