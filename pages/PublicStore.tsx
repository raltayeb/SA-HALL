
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { POSItem, StoreCategory, UserProfile } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { Input } from '../components/ui/Input';
import { Package, ShoppingBag, Loader2, Search, ShoppingCart, X, Plus, CheckCircle2, CreditCard, User, Phone, Truck } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { normalizeNumbers } from '../utils/helpers';

interface PublicStoreProps {
    onPay?: (amount: number, context: 'store_order', refId: string, customerData: any) => Promise<void>;
}

export const PublicStore: React.FC<PublicStoreProps> = ({ onPay }) => {
  // ... (State same as before)
  const [products, setProducts] = useState<POSItem[]>([]);
  const [cart, setCart] = useState<{item: POSItem, qty: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [guestInfo, setGuestInfo] = useState({ name: '', phone: '', address: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
      // Fetch logic ...
      const fetch = async () => {
          const { data } = await supabase.from('pos_items').select('*').gt('stock', 0);
          setProducts(data as any[] || []);
          setLoading(false);
      };
      fetch();
  }, []);

  const addToCart = (item: POSItem) => {
      setCart(prev => {
          const existing = prev.find(i => i.item.id === item.id);
          if (existing) return prev.map(i => i.item.id === item.id ? { ...i, qty: i.qty + 1 } : i);
          return [...prev, { item, qty: 1 }];
      });
      setIsCartOpen(true);
  };

  const cartTotal = cart.reduce((sum, i) => sum + (i.item.price * i.qty), 0);

  const handleCheckout = async () => {
    if (!guestInfo.name || !guestInfo.phone || !guestInfo.address || !guestInfo.email) {
        toast({ title: 'بيانات ناقصة', description: 'يرجى إكمال بيانات التوصيل.', variant: 'destructive' });
        return;
    }

    setIsSubmitting(true);
    try {
        const payload = {
            user_id: null, // guest
            guest_info: guestInfo,
            items: cart.map(c => ({ product_id: c.item.id, name: c.item.name, price: Number(c.item.price), qty: c.qty })),
            total_amount: cartTotal,
            status: 'pending',
            payment_method: 'card',
            delivery_status: 'pending'
        };

        // 1. Create Order
        const { data: order, error } = await supabase.from('store_orders').insert([payload]).select().single();
        if (error) throw error;

        // 2. Trigger Payment
        if (onPay) {
            await onPay(cartTotal, 'store_order', order.id, {
                email: guestInfo.email,
                givenName: guestInfo.name,
                address: guestInfo.address,
                city: 'Riyadh' // Default or add field
            });
        }

    } catch (err: any) {
        toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-tajawal pt-28 pb-20 text-gray-900">
        {/* ... (UI similar to before for Products Grid) ... */}
        <div className="max-w-[1600px] mx-auto px-6">
            <h1 className="text-3xl font-black mb-8">المتجر</h1>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {products.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-[2rem] border border-gray-100">
                        <div className="h-40 bg-gray-50 rounded-2xl mb-4 relative flex items-center justify-center">
                            {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover rounded-2xl" /> : <Package className="w-12 h-12 text-gray-300" />}
                        </div>
                        <h3 className="font-bold mb-2">{item.name}</h3>
                        <div className="flex justify-between items-center">
                            <PriceTag amount={item.price} />
                            <button onClick={() => addToCart(item)} className="bg-primary text-white p-2 rounded-xl"><Plus className="w-5 h-5" /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Cart Sidebar */}
        {isCartOpen && (
            <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex justify-end">
                <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 flex flex-col animate-in slide-in-from-left">
                    <div className="flex justify-between mb-6">
                        <h2 className="text-2xl font-black">السلة</h2>
                        <button onClick={() => setIsCartOpen(false)}><X className="w-6 h-6" /></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-4">
                        {cart.map(c => (
                            <div key={c.item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                                <div>
                                    <p className="font-bold">{c.item.name}</p>
                                    <p className="text-xs text-gray-500">{c.qty} x {c.item.price}</p>
                                </div>
                                <span className="font-black">{c.qty * c.item.price}</span>
                            </div>
                        ))}
                    </div>

                    <div className="border-t pt-6 space-y-4">
                        <Input label="الاسم" value={guestInfo.name} onChange={e => setGuestInfo({...guestInfo, name: e.target.value})} />
                        <Input label="الجوال" value={guestInfo.phone} onChange={e => setGuestInfo({...guestInfo, phone: e.target.value})} />
                        <Input label="البريد" value={guestInfo.email} onChange={e => setGuestInfo({...guestInfo, email: e.target.value})} />
                        <Input label="العنوان" value={guestInfo.address} onChange={e => setGuestInfo({...guestInfo, address: e.target.value})} />
                        
                        <div className="flex justify-between text-xl font-black">
                            <span>الإجمالي</span>
                            <span>{cartTotal} ر.س</span>
                        </div>
                        <Button onClick={handleCheckout} disabled={isSubmitting} className="w-full h-14 rounded-2xl font-black text-lg">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'الدفع وتأكيد الطلب'}
                        </Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
