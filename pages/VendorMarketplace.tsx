
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, POSItem, StoreOrder } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { ShoppingCart, Package, Search, Plus, Minus, Store, Loader2, Clock, Truck, CheckCircle2, X, ShoppingBag } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';

export const VendorMarketplace: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'shop' | 'orders'>('shop');
  const [items, setItems] = useState<POSItem[]>([]);
  const [myOrders, setMyOrders] = useState<StoreOrder[]>([]);
  const [cart, setCart] = useState<{item: POSItem, qty: number}[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // 1. Fetch Admin Products
      const { data: adminItems } = await supabase.from('pos_items')
        .select('*, vendor:vendor_id!inner(role)')
        .eq('vendor.role', 'super_admin')
        .gt('stock', 0);
      setItems(adminItems as any[] || []);

      // 2. Fetch My Orders
      const { data: orders } = await supabase.from('store_orders')
        .select('*')
        .eq('vendor_id', user.id)
        .order('created_at', { ascending: false });
      setMyOrders(orders as any[] || []);
      
      setLoading(false);
    };
    fetchData();
  }, [user.id, activeTab]); 

  const categories = useMemo(() => {
      const cats = items.map(i => i.category || 'عام');
      return ['الكل', ...Array.from(new Set(cats))];
  }, [items]);

  const filteredItems = useMemo(() => {
      return items.filter(item => {
          const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
          const matchCat = selectedCategory === 'الكل' || item.category === selectedCategory;
          return matchSearch && matchCat;
      });
  }, [items, searchQuery, selectedCategory]);

  const addToCart = (item: POSItem) => {
    setCart(prev => {
        const exists = prev.find(i => i.item.id === item.id);
        if (exists) {
            if (exists.qty >= item.stock) return prev;
            return prev.map(i => i.item.id === item.id ? { ...i, qty: i.qty + 1 } : i);
        }
        return [...prev, { item, qty: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
        if (i.item.id === id) {
            const newQty = Math.max(1, i.qty + delta);
            if (newQty > i.item.stock) return i;
            return { ...i, qty: newQty };
        }
        return i;
    }));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.item.id !== id));

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

        // 1. Create Order
        const { data: newOrder, error } = await supabase.from('store_orders').insert([{
            vendor_id: user.id,
            items: orderItems,
            total_amount: total,
            status: 'pending',
            payment_method: 'transfer' // Default for B2B in this context
        }]).select().single();

        if (error) throw error;

        // 2. Auto-create Expense Record
        await supabase.from('expenses').insert([{
            vendor_id: user.id,
            title: `مشتريات متجر #${newOrder.id.slice(0,6)}`,
            amount: total,
            category: 'مشتريات',
            notes: 'تم الخصم تلقائياً عند الطلب من المتجر',
            expense_date: new Date().toISOString().split('T')[0]
        }]);

        // 3. Update stock (Optimistic or handled by trigger usually, here manual)
        for (const c of cart) {
            await supabase.from('pos_items').update({ stock: c.item.stock - c.qty }).eq('id', c.item.id);
        }
        
        toast({ title: 'تم الطلب بنجاح', description: 'تم تسجيل الطلب وإضافته للمصروفات.', variant: 'success' });
        setCart([]);
        setIsCartOpen(false);
        setActiveTab('orders'); 

    } catch (err: any) {
        toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
        setSubmitting(false);
    }
  };

  const cartTotal = cart.reduce((sum, i) => sum + (i.item.price * i.qty), 0);

  return (
    <div className="space-y-8 animate-in fade-in pb-20 font-tajawal text-right">
       {/* Header */}
       <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
             <h2 className="text-3xl font-black text-primary flex items-center gap-2">
                <Store className="w-8 h-8" /> متجر المنصة
             </h2>
             <p className="text-sm text-gray-400 font-bold mt-1">تجهيزات ومعدات بأفضل الأسعار لشركائنا.</p>
          </div>
          <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
             <button onClick={() => setActiveTab('shop')} className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'shop' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-900'}`}>المنتجات</button>
             <button onClick={() => setActiveTab('orders')} className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'orders' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-900'}`}>طلباتي ({myOrders.length})</button>
          </div>
       </div>

       {activeTab === 'shop' ? (
           <div className="relative">
               {/* Search & Filter */}
               <div className="flex flex-col md:flex-row gap-4 mb-6">
                   <div className="relative flex-1">
                       <input 
                           className="w-full h-12 bg-white border border-gray-100 rounded-2xl px-4 pl-10 text-sm font-bold outline-none focus:border-primary transition-all"
                           placeholder="بحث عن منتج..."
                           value={searchQuery}
                           onChange={e => setSearchQuery(e.target.value)}
                       />
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                   </div>
                   <div className="flex gap-2 overflow-x-auto no-scrollbar">
                       {categories.map(cat => (
                           <button 
                               key={cat} 
                               onClick={() => setSelectedCategory(cat)}
                               className={`h-12 px-6 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'}`}
                           >
                               {cat}
                           </button>
                       ))}
                   </div>
               </div>

               <button onClick={() => setIsCartOpen(true)} className="fixed bottom-8 left-8 z-30 bg-gray-900 text-white h-14 px-6 rounded-2xl shadow-xl flex items-center gap-3 font-black hover:scale-105 transition-transform">
                   <ShoppingCart className="w-5 h-5" />
                   <span>{cartTotal} ر.س</span>
               </button>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {loading ? Array.from({length: 4}).map((_, i) => <div key={i} className="aspect-[4/3] bg-gray-100 rounded-[2rem] animate-pulse"></div>) : filteredItems.map(item => (
                        <div key={item.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 hover:shadow-xl hover:border-primary/20 transition-all group relative overflow-hidden flex flex-col">
                           <div className="aspect-square bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-gray-300 group-hover:bg-primary/5 group-hover:text-primary transition-colors relative overflow-hidden">
                              {item.image_url ? (
                                  <img src={item.image_url} className="w-full h-full object-cover rounded-2xl transition-transform duration-500 group-hover:scale-110" />
                              ) : (
                                  <Package className="w-12 h-12" />
                              )}
                           </div>
                           <h3 className="font-black text-gray-900 mb-1 truncate text-lg">{item.name}</h3>
                           <p className="text-xs text-gray-400 font-bold mb-3">{item.category}</p>
                           <div className="flex justify-between items-end mb-4 mt-auto">
                              <PriceTag amount={item.price} className="text-xl font-black text-primary" />
                              <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">{item.stock} متوفر</span>
                           </div>
                           <Button onClick={() => addToCart(item)} className="w-full h-12 rounded-xl font-bold shadow-none bg-gray-900 text-white hover:bg-black">إضافة للسلة</Button>
                        </div>
                  ))}
               </div>
               {filteredItems.length === 0 && !loading && (
                   <div className="text-center py-20 text-gray-400 font-bold">لا توجد منتجات مطابقة للبحث.</div>
               )}
           </div>
       ) : (
           <div className="space-y-6">
               {myOrders.length === 0 ? <p className="text-center py-20 text-gray-400 font-bold">لا توجد طلبات سابقة.</p> : myOrders.map(order => (
                   <div key={order.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm">
                       <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                           <div>
                               <h3 className="text-lg font-black text-gray-900">طلب #{order.id.slice(0, 6)}</h3>
                               <p className="text-xs font-bold text-gray-400 mt-1">{format(new Date(order.created_at), 'dd MMM yyyy')}</p>
                           </div>
                           <PriceTag amount={order.total_amount} className="text-xl font-black text-primary" />
                       </div>
                       
                       {/* Tracking Steps */}
                       <div className="grid grid-cols-4 gap-2 mb-6">
                           {['pending', 'processing', 'shipped', 'delivered'].map((s, idx) => {
                               const currentIdx = ['pending', 'processing', 'shipped', 'delivered'].indexOf(order.delivery_status || 'pending');
                               const isActive = idx <= currentIdx;
                               const labels = ['قيد المراجعة', 'تم التجهيز', 'جاري الشحن', 'تم الاستلام'];
                               const icons = [Clock, Package, Truck, CheckCircle2];
                               const Icon = icons[idx];
                               
                               return (
                                   <div key={s} className={`flex flex-col items-center gap-2 ${isActive ? 'text-primary' : 'text-gray-300'}`}>
                                       <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${isActive ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white'}`}>
                                           <Icon className="w-4 h-4" />
                                       </div>
                                       <span className="text-[10px] font-bold">{labels[idx]}</span>
                                   </div>
                               );
                           })}
                       </div>

                       <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                           {order.items.map((it: any, i: number) => (
                               <div key={i} className="flex justify-between text-xs font-bold text-gray-600">
                                   <span>{it.name} <span className="text-gray-400">x{it.qty}</span></span>
                                   <span>{it.price * it.qty} ر.س</span>
                               </div>
                           ))}
                       </div>
                   </div>
               ))}
           </div>
       )}

       {/* Cart Slide-over */}
       {isCartOpen && (
           <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex justify-end">
               <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col animate-in slide-in-from-left">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="text-2xl font-black flex items-center gap-2"><ShoppingBag className="w-6 h-6" /> السلة</h3>
                       <button onClick={() => setIsCartOpen(false)}><X className="w-6 h-6" /></button>
                   </div>
                   <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                       {cart.length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center text-gray-400 font-bold opacity-60">
                               <ShoppingBag className="w-16 h-16 mb-4" />
                               <p>السلة فارغة</p>
                           </div>
                       ) : cart.map(c => (
                           <div key={c.item.id} className="flex gap-4 items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
                               <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center border shrink-0">
                                   {c.item.image_url ? <img src={c.item.image_url} className="w-full h-full object-cover rounded-xl" /> : <Package className="w-6 h-6 text-gray-300" />}
                               </div>
                               <div className="flex-1">
                                   <p className="font-bold text-sm text-gray-900">{c.item.name}</p>
                                   <PriceTag amount={c.item.price} className="text-xs font-black text-gray-500" />
                                </div>
                                <div className="flex items-center gap-2">
                                   <button onClick={() => updateQty(c.item.id, -1)} className="w-6 h-6 bg-white rounded-lg flex items-center justify-center border text-xs font-bold hover:bg-gray-100">-</button>
                                   <span className="font-bold text-sm w-4 text-center">{c.qty}</span>
                                   <button onClick={() => updateQty(c.item.id, 1)} className="w-6 h-6 bg-white rounded-lg flex items-center justify-center border text-xs font-bold hover:bg-gray-100">+</button>
                               </div>
                               <button onClick={() => removeFromCart(c.item.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                           </div>
                       ))}
                   </div>
                   <div className="pt-6 border-t border-gray-100">
                       <div className="flex justify-between text-xl font-black mb-4">
                           <span>الإجمالي</span>
                           <span>{cartTotal} ر.س</span>
                       </div>
                       <Button onClick={submitOrder} disabled={submitting || cart.length === 0} className="w-full h-14 rounded-2xl font-black text-lg bg-primary text-white shadow-lg shadow-primary/20">
                           {submitting ? <Loader2 className="animate-spin" /> : 'تأكيد الطلب'}
                       </Button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};
