
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { POSItem, POS_CATEGORIES } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  Package, ShoppingBag, Loader2, Search, Filter, 
  ShoppingCart, ChevronLeft, Plus, Minus, X, CheckCircle2 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const PublicStore: React.FC = () => {
  const [products, setProducts] = useState<POSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [cart, setCart] = useState<{item: POSItem, qty: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data } = await supabase.from('pos_items')
        .select('*, vendor:vendor_id!inner(role)')
        .eq('vendor.role', 'super_admin')
        .gt('stock', 0);
      setProducts(data as any[] || []);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchesCat = selectedCategory === 'الكل' || p.category === selectedCategory;
        return matchesSearch && matchesCat;
    });
  }, [products, search, selectedCategory]);

  const addToCart = (item: POSItem) => {
    setCart(prev => {
        const exists = prev.find(i => i.item.id === item.id);
        if (exists) return prev.map(i => i.item.id === item.id ? { ...i, qty: Math.min(i.qty + 1, item.stock) } : i);
        return [...prev, { item, qty: 1 }];
    });
    toast({ title: 'تمت الإضافة للسلة', variant: 'success' });
  };

  const total = cart.reduce((sum, i) => sum + (i.item.price * i.qty), 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F8F9FC] pt-32 pb-20 font-tajawal">
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-12">
        
        {/* Hero Section */}
        <div className="relative bg-gray-900 rounded-[3rem] p-12 md:p-20 text-center text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10 space-y-6">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-md border border-white/10 mb-4">
                    <ShoppingBag className="w-8 h-8" />
                </div>
                <h1 className="text-4xl md:text-6xl font-black">متجر التجهيزات الحصري</h1>
                <p className="text-xl text-white/70 max-w-2xl mx-auto">ارتقِ بمناسبتك مع أفضل المعدات والخدمات المعتمدة من منصتنا.</p>
            </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-3xl border border-gray-100">
           <div className="relative flex-1 w-full">
              <input 
                className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-12 text-right font-bold outline-none focus:ring-1 ring-primary/20"
                placeholder="ابحث عن منتج..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
           </div>
           <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
              {['الكل', ...POS_CATEGORIES].map(cat => (
                <button 
                    key={cat} 
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap border ${selectedCategory === cat ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}
                >
                    {cat}
                </button>
              ))}
           </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {filteredProducts.map((item) => (
                <div key={item.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-6 hover:border-primary/30 transition-all group flex flex-col h-full text-right">
                    <div className="aspect-square bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6 overflow-hidden relative">
                        {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" /> : <Package className="w-16 h-16 text-gray-300" />}
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-xl text-[10px] font-black border border-gray-100">{item.category}</div>
                    </div>
                    <h3 className="text-lg font-black text-gray-900 mb-1 truncate">{item.name}</h3>
                    <PriceTag amount={item.price} className="text-2xl font-black text-primary mb-6" />
                    <Button onClick={() => addToCart(item)} className="w-full h-12 rounded-2xl bg-gray-900 text-white font-black hover:bg-black mt-auto gap-2">
                        <Plus className="w-4 h-4" /> إضافة للسلة
                    </Button>
                </div>
            ))}
        </div>
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
          <button 
            onClick={() => setIsCartOpen(true)}
            className="fixed bottom-8 left-8 bg-primary text-white p-5 rounded-full shadow-2xl animate-bounce z-[100] border-4 border-white"
          >
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">{cart.length}</div>
            <ShoppingCart className="w-6 h-6" />
          </button>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
          <div className="fixed inset-0 z-[200] animate-in fade-in duration-300">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
             <div className="absolute left-0 top-0 bottom-0 w-full max-w-md bg-white animate-in slide-in-from-left duration-500 flex flex-col">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                   <h2 className="text-2xl font-black flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-primary" /> سلة المشتريات</h2>
                   <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"><X className="w-6 h-6" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-4">
                   {cart.map((c, i) => (
                      <div key={i} className="flex gap-4 items-center bg-gray-50 p-4 rounded-3xl border border-gray-100">
                         <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                            {c.item.image_url ? <img src={c.item.image_url} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-gray-200" />}
                         </div>
                         <div className="flex-1 min-w-0">
                            <h4 className="font-black text-sm text-gray-900 truncate">{c.item.name}</h4>
                            <p className="text-[10px] font-bold text-gray-400">{c.item.price} SAR</p>
                         </div>
                         <div className="font-black text-primary">{c.qty}x</div>
                      </div>
                   ))}
                </div>
                <div className="p-8 bg-white border-t border-gray-100 space-y-6">
                   <div className="flex justify-between items-center text-3xl font-black">
                      <span>الإجمالي</span>
                      <PriceTag amount={total} />
                   </div>
                   <Button className="w-full h-16 rounded-[2rem] bg-primary text-white font-black text-xl shadow-none">إتمام الطلب</Button>
                   <p className="text-[10px] text-center font-bold text-gray-400">سيتم ربط المشتريات بحسابك لمتابعة الفاتورة</p>
                </div>
             </div>
          </div>
      )}
    </div>
  );
};
