
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { POSItem, StoreCategory, UserProfile, POS_CATEGORIES } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { Input } from '../components/ui/Input';
import { 
  Package, ShoppingBag, Loader2, Search, ShoppingCart, X, Plus, Minus, 
  CheckCircle2, CreditCard, User, Phone, Truck, MapPin, Store, Trash2, Filter
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { normalizeNumbers } from '../utils/helpers';

interface PublicStoreProps {
    onPay?: (amount: number, context: 'store_order', refId: string, customerData: any) => Promise<void>;
}

export const PublicStore: React.FC<PublicStoreProps> = ({ onPay }) => {
  const [products, setProducts] = useState<POSItem[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<POSItem[]>([]);
  const [cart, setCart] = useState<{item: POSItem, qty: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [guestInfo, setGuestInfo] = useState({ name: '', phone: '', address: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');

  const { toast } = useToast();

  useEffect(() => {
      const fetch = async () => {
          setLoading(true);
          // Fetch items where vendor role is 'super_admin'
          const { data, error } = await supabase
            .from('pos_items')
            .select('*, vendor:vendor_id!inner(role)')
            .eq('vendor.role', 'super_admin') // Only Admin Items
            .gt('stock', 0)
            .order('created_at', { ascending: false });

          if (error) {
              console.error(error);
              toast({ title: 'خطأ', description: 'فشل تحميل المنتجات', variant: 'destructive' });
          } else {
              setProducts(data as any[] || []);
              setFilteredProducts(data as any[] || []);
          }
          setLoading(false);
      };
      fetch();
  }, []);

  useEffect(() => {
      let res = products;
      if (selectedCategory !== 'الكل') {
          res = res.filter(p => p.category === selectedCategory);
      }
      if (searchQuery) {
          res = res.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      setFilteredProducts(res);
  }, [selectedCategory, searchQuery, products]);

  const updateCart = (item: POSItem, delta: number) => {
      setCart(prev => {
          const existing = prev.find(i => i.item.id === item.id);
          const currentQty = existing ? existing.qty : 0;
          const newQty = currentQty + delta;

          if (newQty > item.stock) {
              toast({ title: 'تنبيه', description: 'الكمية المطلوبة غير متوفرة', variant: 'warning' });
              return prev;
          }

          if (newQty <= 0) {
              return prev.filter(i => i.item.id !== item.id);
          }

          if (existing) {
              return prev.map(i => i.item.id === item.id ? { ...i, qty: newQty } : i);
          }
          
          return [...prev, { item, qty: newQty }];
      });
  };

  const getQty = (itemId: string) => cart.find(c => c.item.id === itemId)?.qty || 0;

  const cartTotal = cart.reduce((sum, i) => sum + (i.item.price * i.qty), 0);

  const handlePaymentClick = async (method: 'card' | 'apple' | 'stc') => {
    if (cart.length === 0) return;
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
            payment_method: method,
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
        
        <div className="max-w-[1920px] mx-auto px-6 lg:px-12">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
                <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100 mb-4">
                        <Store className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">المتجر الرسمي</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900">تجهيزات ومستلزمات</h1>
                    <p className="text-gray-500 font-bold mt-2">منتجات حصرية مقدمة من إدارة المنصة لإكمال مناسبتك.</p>
                </div>
                
                {/* Search & Categories Dropdown */}
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-end">
                    
                    {/* Category Dropdown */}
                    <div className="relative w-full sm:w-48">
                        <select 
                            className="w-full h-12 bg-white border border-gray-100 rounded-2xl px-4 pl-10 text-right font-bold outline-none focus:border-primary/20 transition-all text-sm appearance-none cursor-pointer text-gray-700"
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                        >
                            <option value="الكل">كل التصنيفات</option>
                            {POS_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-80">
                        <input 
                            className="w-full h-12 bg-white border border-gray-100 rounded-2xl px-10 text-right font-bold outline-none focus:border-primary/20 transition-all placeholder:text-gray-300"
                            placeholder="ابحث عن منتج..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* Products Grid (5 Columns on Large Screens) */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {[1,2,3,4,5].map(i => <div key={i} className="aspect-[3/4] bg-white rounded-[2.5rem] animate-pulse border border-gray-100"></div>)}
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="text-center py-32 bg-white rounded-[3rem] border border-dashed border-gray-200">
                    <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-bold">لا توجد منتجات متاحة حالياً.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                    {filteredProducts.map(item => {
                        const qty = getQty(item.id);
                        return (
                            <div key={item.id} className="group bg-white p-4 rounded-[2.5rem] border border-gray-100 hover:border-primary/20 hover:shadow-xl transition-all duration-500 flex flex-col relative">
                                {/* Image Area */}
                                <div className="aspect-square bg-gray-50 rounded-[2rem] overflow-hidden relative mb-4 flex items-center justify-center">
                                    {item.image_url ? (
                                        <img src={item.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.name} />
                                    ) : (
                                        <Package className="w-12 h-12 text-gray-200" />
                                    )}
                                    {qty > 0 && (
                                        <div className="absolute top-4 right-4 bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-lg animate-in zoom-in">
                                            {qty}
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="px-2 flex-1 flex flex-col">
                                    <h3 className="font-black text-lg text-gray-900 mb-1 line-clamp-1">{item.name}</h3>
                                    <p className="text-xs text-gray-400 font-bold mb-4">{item.category}</p>
                                    
                                    <div className="mt-auto flex items-center justify-between">
                                        <PriceTag amount={item.price} className="text-xl font-black text-primary" />
                                        
                                        {/* Circular Actions */}
                                        <div className="flex items-center bg-gray-50 rounded-full p-1 border border-gray-100">
                                            {qty > 0 ? (
                                                <>
                                                    <button onClick={() => updateCart(item, 1)} className="w-8 h-8 rounded-full bg-white text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors shadow-sm">
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                    <span className="w-8 text-center font-black text-sm">{qty}</span>
                                                    <button onClick={() => updateCart(item, -1)} className="w-8 h-8 rounded-full bg-white text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors shadow-sm">
                                                        {qty === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => updateCart(item, 1)} className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md">
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* Floating Cart Button */}
        {cart.length > 0 && (
            <div className="fixed bottom-8 left-8 z-40 animate-in slide-in-from-bottom-10 fade-in">
                <button 
                    onClick={() => setIsCartOpen(true)}
                    className="h-16 px-8 bg-gray-900 text-white rounded-[2rem] shadow-2xl flex items-center gap-4 hover:scale-105 transition-transform group"
                >
                    <div className="relative">
                        <ShoppingBag className="w-6 h-6" />
                        <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary rounded-full text-[10px] flex items-center justify-center font-black border-2 border-gray-900">
                            {cart.reduce((s, i) => s + i.qty, 0)}
                        </span>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">المجموع</p>
                        <PriceTag amount={cartTotal} className="text-lg font-black text-white" />
                    </div>
                </button>
            </div>
        )}

        {/* Cart Sidebar / Drawer */}
        {isCartOpen && (
            <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex justify-end">
                <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 border-r border-gray-200">
                    
                    {/* Header */}
                    <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-white">
                        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            <ShoppingBag className="w-6 h-6 text-primary" /> سلة المشتريات
                        </h2>
                        <button onClick={() => setIsCartOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                    
                    {/* Items List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        {cart.map(c => (
                            <div key={c.item.id} className="flex gap-4 items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-50 shrink-0 overflow-hidden">
                                    {c.item.image_url ? <img src={c.item.image_url} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-gray-300" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-sm text-gray-900 truncate">{c.item.name}</p>
                                    <PriceTag amount={c.item.price * c.qty} className="text-xs font-bold text-primary mt-1" />
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1">
                                    <button onClick={() => updateCart(c.item, 1)} className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-[10px] font-bold shadow-sm hover:text-primary transition-colors">+</button>
                                    <span className="text-xs font-black w-4 text-center">{c.qty}</span>
                                    <button onClick={() => updateCart(c.item, -1)} className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-[10px] font-bold shadow-sm hover:text-red-500 transition-colors">-</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer & Checkout */}
                    <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-4">
                        
                        {/* Guest Form */}
                        <div className="space-y-3">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">بيانات التوصيل</p>
                            <Input placeholder="الاسم" value={guestInfo.name} onChange={e => setGuestInfo({...guestInfo, name: e.target.value})} className="h-11 rounded-xl bg-white border-transparent focus:border-primary/20" />
                            <Input placeholder="الجوال" value={guestInfo.phone} onChange={e => setGuestInfo({...guestInfo, phone: normalizeNumbers(e.target.value)})} className="h-11 rounded-xl bg-white border-transparent focus:border-primary/20" />
                            <Input placeholder="البريد الإلكتروني" value={guestInfo.email} onChange={e => setGuestInfo({...guestInfo, email: e.target.value})} className="h-11 rounded-xl bg-white border-transparent focus:border-primary/20" />
                            <Input placeholder="العنوان بالتفصيل" value={guestInfo.address} onChange={e => setGuestInfo({...guestInfo, address: e.target.value})} className="h-11 rounded-xl bg-white border-transparent focus:border-primary/20" />
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-gray-200 border-dashed">
                            <span className="font-bold text-gray-500">الإجمالي النهائي</span>
                            <PriceTag amount={cartTotal} className="text-2xl font-black text-gray-900" />
                        </div>

                        {/* Payment Methods */}
                        {isSubmitting ? (
                            <div className="w-full h-14 bg-white rounded-2xl flex items-center justify-center gap-2 text-gray-500 font-bold border border-gray-200">
                                <Loader2 className="animate-spin" /> جاري المعالجة...
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => handlePaymentClick('apple')} className="h-12 rounded-xl bg-black flex items-center justify-center hover:opacity-80 transition-opacity border border-black overflow-hidden relative">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" className="h-5 w-auto invert" />
                                </button>
                                <button onClick={() => handlePaymentClick('stc')} className="h-12 rounded-xl bg-[#4F008C] flex items-center justify-center hover:opacity-80 transition-opacity border border-[#4F008C] overflow-hidden relative">
                                    <span className="text-white font-black text-sm">stc pay</span>
                                </button>
                                <button onClick={() => handlePaymentClick('card')} className="h-12 rounded-xl bg-white flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200 overflow-hidden relative gap-1 px-1">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-3 w-auto" />
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5 w-auto" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
