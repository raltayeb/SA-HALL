
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { POSItem, POS_CATEGORIES, UserProfile } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { Input } from '../components/ui/Input';
import { 
  Package, ShoppingBag, Loader2, Search, ShoppingCart, 
  Heart, Star, X, Plus, Minus, CheckCircle2, Truck, CreditCard, User, Phone, MapPin
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { normalizeNumbers } from '../utils/helpers';

export const PublicStore: React.FC = () => {
  const [products, setProducts] = useState<POSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  
  // Cart State
  const [cart, setCart] = useState<{item: POSItem, qty: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Checkout State
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'info' | 'success'>('cart');
  const [guestInfo, setGuestInfo] = useState({ name: '', phone: '', address: '' });
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
              setGuestInfo({ 
                  name: profile.full_name || '', 
                  phone: profile.phone_number || '', 
                  address: '' 
              });
          }
      }

      // Fetch Products (Owned by Super Admin)
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
        return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

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
    if (!guestInfo.name || !guestInfo.phone || !guestInfo.address) {
        toast({ title: 'بيانات ناقصة', description: 'يرجى إكمال بيانات التوصيل.', variant: 'destructive' });
        return;
    }

    setIsSubmitting(true);
    try {
        const payload = {
            user_id: user?.id || null,
            guest_info: guestInfo,
            items: cart.map(c => ({ product_id: c.item.id, name: c.item.name, price: Number(c.item.price), qty: c.qty })),
            total_amount: cartTotal,
            status: 'pending',
            payment_method: 'cod',
            delivery_status: 'pending'
        };

        const { error } = await supabase.from('store_orders').insert([payload]);
        if (error) throw error;

        // Deduct Stock
        for (const c of cart) {
            await supabase.from('pos_items').update({ stock: c.item.stock - c.qty }).eq('id', c.item.id);
        }

        // Notify Admins
        const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'super_admin');
        if (admins) {
            const notifs = admins.map(admin => ({
                user_id: admin.id,
                title: 'طلب شراء جديد 🛍️',
                message: `طلب جديد من ${guestInfo.name} بقيمة ${cartTotal} ر.س`,
                type: 'system',
                link: 'admin_store'
            }));
            await supabase.from('notifications').insert(notifs);
        }

        setCheckoutStep('success');
        setCart([]);
        toast({ title: 'تم الطلب بنجاح', variant: 'success' });

    } catch (err: any) {
        toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-tajawal pt-24 pb-20 relative">
      
      {/* 1. Hero Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="bg-white border border-gray-100 rounded-[3rem] p-8 md:p-16 text-right relative overflow-hidden shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-50/50 to-pink-50/50 opacity-50"></div>
            
            <div className="relative z-10 max-w-2xl space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 text-primary border border-primary/10 text-xs font-bold mb-2">
                    <ShoppingBag className="w-4 h-4" /> متجر التجهيزات
                </div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-gray-900">
                    تجهيزات فاخرة <br/> 
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">لمناسبات لا تُنسى</span>
                </h1>
                <p className="text-lg text-gray-500 font-medium leading-relaxed max-w-lg">
                    معدات صوتية، إضاءة، كراسي فندقية، وضيافة فاخرة بأسعار تنافسية وتوصيل سريع.
                </p>
            </div>

            <div className="relative z-10 w-full md:w-[350px]">
                <img src="https://cdni.iconscout.com/illustration/premium/thumb/online-shopping-8604347-6804342.png?f=webp" alt="Shopping" className="w-full h-auto drop-shadow-xl animate-in slide-in-from-right-10 duration-1000" />
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 2. Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10 sticky top-24 z-30 bg-[#F8F9FC]/90 backdrop-blur-xl py-4 transition-all">
            <div className="relative w-full md:w-[400px]">
                <input 
                    type="text" 
                    placeholder="ابحث عن منتج..." 
                    className="w-full h-14 bg-white border border-gray-100 rounded-2xl px-12 text-right font-bold outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar w-full md:w-auto">
                <button 
                    onClick={() => setSelectedCategory('الكل')} 
                    className={`px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all border ${selectedCategory === 'الكل' ? 'bg-gray-900 text-white border-gray-900 shadow-lg' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'}`}
                >
                    الكل
                </button>
                {POS_CATEGORIES.map(cat => (
                    <button 
                        key={cat} 
                        onClick={() => setSelectedCategory(cat)} 
                        className={`px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-gray-900 text-white border-gray-900 shadow-lg' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
            
            <button onClick={() => { setIsCartOpen(true); setCheckoutStep('cart'); }} className="relative bg-white h-14 w-14 rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm hover:border-primary/30 transition-all group">
                <ShoppingCart className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                {cart.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold border-2 border-white">{cart.length}</span>}
            </button>
        </div>

        {/* 3. Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredProducts.map((item) => (
                <div key={item.id} className="group bg-white border border-gray-100 rounded-[2.5rem] p-4 hover:shadow-2xl hover:border-primary/20 transition-all duration-300 flex flex-col relative overflow-hidden">
                    {/* Image Area */}
                    <div className="aspect-square bg-gray-50 rounded-[2rem] mb-4 relative overflow-hidden group-hover:bg-gray-100 transition-colors flex items-center justify-center">
                        {item.image_url ? (
                            <img src={item.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.name} />
                        ) : (
                            <Package className="w-16 h-16 text-gray-300" />
                        )}
                        {item.stock < 5 && <div className="absolute top-4 left-4 bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-lg">بقي القليل</div>}
                    </div>
                    
                    {/* Content */}
                    <div className="px-2 pb-2 flex-1 flex flex-col text-right">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">{item.category}</span>
                            <div className="flex items-center gap-1 text-yellow-400 text-[10px] font-black"><Star className="w-3 h-3 fill-current" /> 4.9</div>
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mb-1 line-clamp-1 group-hover:text-primary transition-colors">{item.name}</h3>
                        
                        <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50">
                            <PriceTag amount={item.price} className="text-xl font-black text-gray-900" />
                            <Button size="sm" onClick={() => addToCart(item)} className="h-10 w-10 rounded-xl p-0 bg-gray-900 text-white hover:bg-primary transition-colors shadow-lg">
                                <Plus className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {filteredProducts.length === 0 && (
            <div className="text-center py-32 opacity-50">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-xl font-bold text-gray-400">لا توجد منتجات مطابقة للبحث.</p>
            </div>
        )}
      </div>

      {/* 4. Cart Sidebar / Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <button onClick={() => setIsCartOpen(false)} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
                    <h2 className="text-xl font-black text-gray-900">
                        {checkoutStep === 'cart' ? 'سلة المشتريات' : checkoutStep === 'info' ? 'إتمام الطلب' : 'تم بنجاح'}
                    </h2>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-right">
                    
                    {/* STEP 1: CART ITEMS */}
                    {checkoutStep === 'cart' && (
                        <>
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
                                    <ShoppingBag className="w-20 h-20 opacity-50" />
                                    <p className="font-bold text-gray-400">السلة فارغة</p>
                                    <Button variant="outline" onClick={() => setIsCartOpen(false)} className="mt-4">تصفح المنتجات</Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {cart.map((c) => (
                                        <div key={c.item.id} className="flex gap-4 bg-white border border-gray-100 p-3 rounded-2xl items-center">
                                            <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                                                {c.item.image_url ? <img src={c.item.image_url} className="w-full h-full object-cover rounded-xl" /> : <Package className="w-6 h-6 text-gray-300" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-gray-900 text-sm truncate">{c.item.name}</h4>
                                                <PriceTag amount={c.item.price} className="text-primary text-sm font-black" />
                                            </div>
                                            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                                                <button onClick={() => updateQty(c.item.id, 1)} className="w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center text-xs font-bold">+</button>
                                                <span className="text-xs font-black w-4 text-center">{c.qty}</span>
                                                <button onClick={() => c.qty > 1 ? updateQty(c.item.id, -1) : removeFromCart(c.item.id)} className="w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center text-xs font-bold text-red-500">-</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* STEP 2: CHECKOUT INFO */}
                    {checkoutStep === 'info' && (
                        <div className="space-y-6 animate-in slide-in-from-right">
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-sm text-blue-800 font-bold mb-4">
                                سيتم الدفع عند الاستلام أو عبر التحويل البنكي بعد تأكيد الطلب.
                            </div>
                            
                            <div className="space-y-4">
                                <Input label="الاسم الكامل" value={guestInfo.name} onChange={e => setGuestInfo({...guestInfo, name: e.target.value})} className="h-12 rounded-xl text-right font-bold" icon={<User className="w-4 h-4" />} />
                                <Input label="رقم الجوال" value={guestInfo.phone} onChange={e => setGuestInfo({...guestInfo, phone: normalizeNumbers(e.target.value)})} className="h-12 rounded-xl text-right font-bold" icon={<Phone className="w-4 h-4" />} />
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500">عنوان التوصيل (المدينة - الحي - الشارع)</label>
                                    <textarea className="w-full h-24 border border-gray-200 rounded-xl p-3 text-sm font-bold focus:ring-1 ring-primary/20 outline-none resize-none bg-white" value={guestInfo.address} onChange={e => setGuestInfo({...guestInfo, address: e.target.value})} />
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-6">
                                <h4 className="text-xs font-black text-gray-400 uppercase mb-3 tracking-widest">ملخص الطلب</h4>
                                <div className="flex justify-between text-sm font-bold text-gray-600 mb-2">
                                    <span>عدد المنتجات</span>
                                    <span>{cart.reduce((s,i) => s + i.qty, 0)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-black text-gray-900 border-t border-gray-200 pt-2">
                                    <span>الإجمالي</span>
                                    <PriceTag amount={cartTotal} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: SUCCESS */}
                    {checkoutStep === 'success' && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in">
                            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-4 animate-bounce">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900">تم استلام طلبك بنجاح!</h3>
                            <p className="text-gray-500 font-bold max-w-xs mx-auto">سيقوم فريق المبيعات بالتواصل معك قريباً لتأكيد الطلب وترتيب التوصيل.</p>
                            <Button onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }} className="w-full h-14 rounded-2xl font-black">متابعة التسوق</Button>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {checkoutStep !== 'success' && cart.length > 0 && (
                    <div className="p-6 border-t border-gray-100 bg-white">
                        {checkoutStep === 'cart' ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-gray-500">الإجمالي</span>
                                    <PriceTag amount={cartTotal} className="text-2xl font-black text-primary" />
                                </div>
                                <Button onClick={() => setCheckoutStep('info')} className="w-full h-14 rounded-2xl font-black text-lg bg-gray-900 text-white shadow-xl hover:scale-[1.02] transition-transform">
                                    إتمام الشراء
                                </Button>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setCheckoutStep('cart')} className="h-14 px-6 rounded-2xl font-bold border-gray-200">رجوع</Button>
                                <Button onClick={handleCheckout} disabled={isSubmitting} className="flex-1 h-14 rounded-2xl font-black text-lg bg-primary text-white shadow-xl">
                                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'تأكيد الطلب'}
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
