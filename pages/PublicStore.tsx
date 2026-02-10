
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { POSItem, POS_CATEGORIES, UserProfile } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { Input } from '../components/ui/Input';
import { 
  Package, ShoppingBag, Loader2, Search, ShoppingCart, 
  Star, X, Plus, Minus, CheckCircle2, CreditCard, User, Phone, MapPin, Filter, ArrowLeft, Truck
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { normalizeNumbers } from '../utils/helpers';

export const PublicStore: React.FC = () => {
  const [products, setProducts] = useState<POSItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [priceRange, setPriceRange] = useState<{min: number, max: number}>({ min: 0, max: 10000 });
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Cart State
  const [cart, setCart] = useState<{item: POSItem, qty: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Checkout State
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'payment' | 'success'>('cart');
  const [guestInfo, setGuestInfo] = useState({ name: '', phone: '', address: '', cardNumber: '', expiry: '', cvv: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      // Fetch User
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          setUser(profile);
          if (profile) {
              setGuestInfo(prev => ({ 
                  ...prev,
                  name: profile.full_name || '', 
                  phone: profile.phone_number || ''
              }));
          }
      }

      // Fetch Products
      const { data } = await supabase.from('pos_items')
        .select('*, vendor:vendor_id!inner(role)')
        .eq('vendor.role', 'super_admin')
        .gt('stock', 0)
        .order('created_at', { ascending: false });
        
      setProducts(data as any[] || []);
      setLoading(false);
    };
    init();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = selectedCategory === 'الكل' || p.category === selectedCategory;
        const matchesPrice = Number(p.price) >= priceRange.min && Number(p.price) <= priceRange.max;
        return matchesSearch && matchesCat && matchesPrice;
    });
  }, [products, searchQuery, selectedCategory, priceRange]);

  const addToCart = (item: POSItem) => {
    setCart(prev => {
        const exists = prev.find(i => i.item.id === item.id);
        if (exists) {
            if (exists.qty >= item.stock) {
                toast({ title: 'نعتذر', description: 'الكمية المطلوبة غير متوفرة', variant: 'warning' });
                return prev;
            }
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

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.item.id !== id));
  };

  const cartTotal = cart.reduce((sum, i) => sum + (i.item.price * i.qty), 0);

  const handleCheckout = async () => {
    // Validate Info + Fake Card Info
    if (!guestInfo.name || !guestInfo.phone || !guestInfo.address) {
        toast({ title: 'بيانات ناقصة', description: 'يرجى إكمال بيانات التوصيل.', variant: 'destructive' });
        return;
    }
    if (!guestInfo.cardNumber || !guestInfo.expiry || !guestInfo.cvv) {
        toast({ title: 'بيانات الدفع', description: 'يرجى إدخال بيانات البطاقة البنكية.', variant: 'destructive' });
        return;
    }

    setIsSubmitting(true);
    // Simulate Payment Processing Delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
        const payload = {
            user_id: user?.id || null,
            guest_info: { 
                name: guestInfo.name, 
                phone: guestInfo.phone, 
                address: guestInfo.address 
            },
            items: cart.map(c => ({ product_id: c.item.id, name: c.item.name, price: Number(c.item.price), qty: c.qty })),
            total_amount: cartTotal,
            status: 'pending',
            payment_method: 'card', // Enforced Online Payment
            delivery_status: 'pending'
        };

        const { error } = await supabase.from('store_orders').insert([payload]);
        if (error) throw error;

        // Deduct Stock
        for (const c of cart) {
            await supabase.from('pos_items').update({ stock: c.item.stock - c.qty }).eq('id', c.item.id);
        }

        setCheckoutStep('success');
        setCart([]);
        toast({ title: 'تم الدفع بنجاح', description: 'عملية شراء ناجحة، شكراً لك.', variant: 'success' });

    } catch (err: any) {
        toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-tajawal pt-28 pb-20 text-gray-900">
      
      {/* 1. Page Header */}
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12 mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 text-primary border border-primary/10 text-[10px] font-black uppercase tracking-widest mb-3">
                <ShoppingBag className="w-4 h-4" /> المتجر الرسمي
            </div>
            <h1 className="text-4xl font-black text-gray-900">تجهيزات المناسبات</h1>
            <p className="text-gray-500 font-bold mt-2 text-lg">كل ما تحتاجه لإكمال مناسبتك بلمسة فاخرة.</p>
        </div>
        
        <button 
            onClick={() => setIsCartOpen(true)} 
            className="h-14 px-6 bg-white border-2 border-gray-100 hover:border-primary text-gray-900 rounded-[1.5rem] flex items-center gap-3 transition-all group"
        >
            <div className="relative">
                <ShoppingCart className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                {cart.length > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">{cart.length}</span>}
            </div>
            <div className="text-right hidden md:block">
                <span className="block text-[10px] font-bold text-gray-400">سلة المشتريات</span>
                <span className="block text-sm font-black">{cartTotal.toLocaleString()} ر.س</span>
            </div>
        </button>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row gap-10 items-start">
            
            {/* 2. Sidebar Filter */}
            <aside className={`
                lg:w-72 shrink-0 space-y-8 lg:sticky lg:top-32
                ${showMobileFilter ? 'fixed inset-0 z-50 bg-white p-6 overflow-y-auto' : 'hidden lg:block'}
            `}>
                {showMobileFilter && (
                    <div className="flex justify-between items-center mb-6 lg:hidden">
                        <h3 className="text-xl font-black">تصفية المنتجات</h3>
                        <button onClick={() => setShowMobileFilter(false)}><X className="w-6 h-6" /></button>
                    </div>
                )}

                {/* Search */}
                <div className="space-y-3">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">بحث</label>
                    <div className="relative">
                        <input 
                            className="w-full h-14 bg-white border-2 border-gray-100 rounded-2xl px-12 text-right font-bold outline-none focus:border-primary transition-all"
                            placeholder="اسم المنتج..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
                    </div>
                </div>

                {/* Categories */}
                <div className="space-y-3">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">التصنيفات</label>
                    <div className="flex flex-col gap-2">
                        <button 
                            onClick={() => setSelectedCategory('الكل')}
                            className={`h-12 px-4 rounded-xl text-right text-sm font-bold transition-all border-2 flex justify-between items-center ${selectedCategory === 'الكل' ? 'bg-primary text-white border-primary' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'}`}
                        >
                            <span>الكل</span>
                            {selectedCategory === 'الكل' && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        {POS_CATEGORIES.map(cat => (
                            <button 
                                key={cat} 
                                onClick={() => setSelectedCategory(cat)} 
                                className={`h-12 px-4 rounded-xl text-right text-sm font-bold transition-all border-2 flex justify-between items-center ${selectedCategory === cat ? 'bg-primary text-white border-primary' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'}`}
                            >
                                <span>{cat}</span>
                                {selectedCategory === cat && <CheckCircle2 className="w-4 h-4" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Price Range */}
                <div className="space-y-4">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">السعر (ر.س)</label>
                    <div className="flex items-center gap-2">
                        <input type="number" value={priceRange.min} onChange={e => setPriceRange({...priceRange, min: Number(e.target.value)})} className="w-full h-12 rounded-xl border-2 border-gray-100 text-center font-bold outline-none focus:border-primary" placeholder="من" />
                        <span className="text-gray-300">-</span>
                        <input type="number" value={priceRange.max} onChange={e => setPriceRange({...priceRange, max: Number(e.target.value)})} className="w-full h-12 rounded-xl border-2 border-gray-100 text-center font-bold outline-none focus:border-primary" placeholder="إلى" />
                    </div>
                </div>

                {showMobileFilter && (
                    <Button onClick={() => setShowMobileFilter(false)} className="w-full h-14 rounded-2xl font-black text-lg mt-8">
                        عرض النتائج ({filteredProducts.length})
                    </Button>
                )}
            </aside>

            {/* 3. Products Grid */}
            <div className="flex-1 w-full">
                
                {/* Mobile Filter Toggle */}
                <div className="lg:hidden mb-6">
                    <button onClick={() => setShowMobileFilter(true)} className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl font-bold flex items-center justify-center gap-2 text-gray-600">
                        <Filter className="w-5 h-5" /> تصفية المنتجات
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredProducts.map((item) => (
                        <div key={item.id} className="bg-white border-2 border-gray-50 rounded-[2.5rem] p-4 flex flex-col hover:border-primary/20 transition-all duration-300 group relative">
                            {/* Image */}
                            <div className="aspect-square bg-[#F8F9FC] rounded-[2rem] mb-4 relative overflow-hidden flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-500">
                                {item.image_url ? (
                                    <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} />
                                ) : (
                                    <Package className="w-16 h-16 text-gray-200" />
                                )}
                                {item.stock < 5 && <div className="absolute top-4 left-4 bg-red-50 text-red-500 text-[10px] font-black px-3 py-1.5 rounded-full border border-red-100">بقي القليل</div>}
                            </div>
                            
                            {/* Content */}
                            <div className="px-2 pb-2 flex-1 flex flex-col text-right">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">{item.category}</span>
                                    <div className="flex items-center gap-1 text-yellow-400 text-[10px] font-black"><Star className="w-3 h-3 fill-current" /> 4.9</div>
                                </div>
                                <h3 className="text-lg font-black text-gray-900 mb-1 line-clamp-1">{item.name}</h3>
                                
                                <div className="mt-auto pt-4 flex items-center justify-between">
                                    <PriceTag amount={item.price} className="text-xl font-black text-gray-900" />
                                    <button onClick={() => addToCart(item)} className="w-10 h-10 rounded-full bg-gray-900 text-white hover:bg-primary transition-colors flex items-center justify-center">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 bg-white border-2 border-dashed border-gray-100 rounded-[3rem]">
                        <Package className="w-16 h-16 mb-4 text-gray-200" />
                        <p className="text-xl font-bold text-gray-400">لا توجد منتجات مطابقة.</p>
                        <button onClick={() => { setSearchQuery(''); setSelectedCategory('الكل'); }} className="mt-4 text-primary font-bold hover:underline">إعادة تعيين الفلتر</button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* 4. Cart & Checkout Modal (Flat Design) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-lg bg-white h-full shadow-none border-l border-gray-100 flex flex-col animate-in slide-in-from-left duration-300">
                
                {/* Header */}
                <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                    <button onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }} className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"><X className="w-6 h-6 text-gray-900" /></button>
                    <h2 className="text-2xl font-black text-gray-900">
                        {checkoutStep === 'cart' ? 'سلة المشتريات' : checkoutStep === 'payment' ? 'الدفع الآمن' : 'تم الطلب'}
                    </h2>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar text-right">
                    
                    {/* STEP 1: CART */}
                    {checkoutStep === 'cart' && (
                        <>
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4 opacity-50">
                                    <ShoppingBag className="w-24 h-24" />
                                    <p className="font-bold text-lg">السلة فارغة</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {cart.map((c) => (
                                        <div key={c.item.id} className="flex gap-5 items-center">
                                            <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100">
                                                {c.item.image_url ? <img src={c.item.image_url} className="w-full h-full object-cover rounded-2xl" /> : <Package className="w-8 h-8 text-gray-300" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-gray-900 text-base truncate mb-1">{c.item.name}</h4>
                                                <PriceTag amount={c.item.price} className="text-gray-500 text-sm font-bold" />
                                            </div>
                                            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-1.5 border border-gray-100">
                                                <button onClick={() => updateQty(c.item.id, 1)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-xs font-bold hover:text-primary transition-colors">+</button>
                                                <span className="text-sm font-black w-4 text-center">{c.qty}</span>
                                                <button onClick={() => c.qty > 1 ? updateQty(c.item.id, -1) : removeFromCart(c.item.id)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-xs font-bold text-red-500 hover:bg-red-50 transition-colors">-</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* STEP 2: PAYMENT INFO */}
                    {checkoutStep === 'payment' && (
                        <div className="space-y-8 animate-in slide-in-from-right">
                            {/* Shipping Info */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Truck className="w-4 h-4" /> بيانات التوصيل</h4>
                                <Input label="الاسم الكامل" value={guestInfo.name} onChange={e => setGuestInfo({...guestInfo, name: e.target.value})} className="h-14 rounded-2xl font-bold bg-gray-50 border-transparent focus:bg-white focus:border-gray-200" icon={<User className="w-4 h-4" />} />
                                <Input label="رقم الجوال" value={guestInfo.phone} onChange={e => setGuestInfo({...guestInfo, phone: normalizeNumbers(e.target.value)})} className="h-14 rounded-2xl font-bold bg-gray-50 border-transparent focus:bg-white focus:border-gray-200" icon={<Phone className="w-4 h-4" />} />
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500">العنوان بالتفصيل</label>
                                    <textarea className="w-full h-24 border-2 border-transparent bg-gray-50 rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-gray-200 outline-none resize-none" value={guestInfo.address} onChange={e => setGuestInfo({...guestInfo, address: e.target.value})} />
                                </div>
                            </div>

                            {/* Card Payment Info */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><CreditCard className="w-4 h-4" /> الدفع الإلكتروني (آمن)</h4>
                                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                                    <div className="flex gap-2 mb-2">
                                        <div className="h-8 w-12 bg-white rounded border border-gray-200"></div>
                                        <div className="h-8 w-12 bg-white rounded border border-gray-200"></div>
                                    </div>
                                    <Input placeholder="رقم البطاقة" value={guestInfo.cardNumber} onChange={e => setGuestInfo({...guestInfo, cardNumber: normalizeNumbers(e.target.value)})} maxLength={16} className="h-12 rounded-xl bg-white text-center font-mono" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input placeholder="MM/YY" value={guestInfo.expiry} onChange={e => setGuestInfo({...guestInfo, expiry: normalizeNumbers(e.target.value)})} maxLength={5} className="h-12 rounded-xl bg-white text-center font-mono" />
                                        <Input placeholder="CVV" value={guestInfo.cvv} onChange={e => setGuestInfo({...guestInfo, cvv: normalizeNumbers(e.target.value)})} maxLength={3} type="password" className="h-12 rounded-xl bg-white text-center font-mono" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: SUCCESS */}
                    {checkoutStep === 'success' && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in">
                            <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-green-500/20 mb-4">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <h3 className="text-3xl font-black text-gray-900">تم الدفع بنجاح!</h3>
                            <p className="text-gray-500 font-bold max-w-xs mx-auto leading-relaxed">شكراً لطلبك. سيتم تجهيز طلبك وشحنه إلى العنوان المسجل.</p>
                            <Button onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }} variant="outline" className="w-full h-14 rounded-2xl font-black border-2 border-gray-100">عودة للمتجر</Button>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                {checkoutStep !== 'success' && cart.length > 0 && (
                    <div className="p-8 border-t border-gray-100 bg-white space-y-4">
                        <div className="flex justify-between items-center text-lg">
                            <span className="text-gray-500 font-bold">الإجمالي</span>
                            <PriceTag amount={cartTotal} className="text-2xl font-black text-gray-900" />
                        </div>
                        {checkoutStep === 'cart' ? (
                            <Button onClick={() => setCheckoutStep('payment')} className="w-full h-16 rounded-[1.5rem] font-black text-lg bg-gray-900 text-white shadow-none hover:bg-black transition-transform active:scale-95">
                                متابعة للدفع
                            </Button>
                        ) : (
                            <div className="flex gap-4">
                                <Button variant="outline" onClick={() => setCheckoutStep('cart')} className="h-16 px-8 rounded-[1.5rem] font-bold border-2 border-gray-100 text-gray-500">رجوع</Button>
                                <Button onClick={handleCheckout} disabled={isSubmitting} className="flex-1 h-16 rounded-[1.5rem] font-black text-lg bg-primary text-white shadow-none hover:bg-primary/90">
                                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : `دفع ${cartTotal} ر.س`}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};
