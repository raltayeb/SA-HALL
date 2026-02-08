
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { POSItem, POS_CATEGORIES } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { Package, ShoppingBag, Loader2, Search, Filter, ShoppingCart, Heart, ChevronLeft, Star } from 'lucide-react';

export const PublicStore: React.FC = () => {
  const [products, setProducts] = useState<POSItem[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<POSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data } = await supabase.from('pos_items')
        .select('*, vendor:vendor_id!inner(role)')
        .eq('vendor.role', 'super_admin')
        .gt('stock', 0)
        .order('created_at', { ascending: false });
      setProducts(data as any[] || []);
      setFilteredProducts(data as any[] || []);
      setLoading(false);
    };
    fetchProducts();
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-tajawal pt-24 pb-20">
      
      {/* 1. Hero Banner (Daytime Mode) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="bg-white border border-gray-100 rounded-[3rem] p-8 md:p-16 text-right relative overflow-hidden shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-50/50 to-pink-50/50 opacity-50"></div>
            
            <div className="relative z-10 max-w-2xl space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 text-primary border border-primary/10 text-xs font-bold mb-2">
                    <ShoppingBag className="w-4 h-4" /> متجر التجهيزات
                </div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-gray-900">
                    كل ما تحتاجه <br/> 
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">لمناسبتك في مكان واحد</span>
                </h1>
                <p className="text-lg text-gray-500 font-medium leading-relaxed max-w-lg">
                    معدات صوتية، إضاءة، كراسي فندقية، وضيافة فاخرة بأسعار تنافسية.
                </p>
                {/* Button Removed as requested */}
            </div>

            <div className="relative z-10 w-full md:w-[400px]">
                <img src="https://cdni.iconscout.com/illustration/premium/thumb/online-shopping-8604347-6804342.png?f=webp" alt="Shopping" className="w-full h-auto drop-shadow-xl animate-in slide-in-from-right-10 duration-1000" />
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 2. Controls (Search & Filters) */}
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
        </div>

        {/* 3. Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredProducts.map((item) => (
                <div key={item.id} className="group bg-white border border-gray-100 rounded-[2.5rem] p-4 hover:shadow-2xl hover:border-primary/20 transition-all duration-300 flex flex-col relative overflow-hidden">
                    
                    {/* Badge */}
                    {item.stock < 5 && (
                        <div className="absolute top-6 left-6 z-20 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-sm">
                            بقي القليل
                        </div>
                    )}

                    {/* Image Area */}
                    <div className="aspect-square bg-gray-50 rounded-[2rem] mb-4 relative overflow-hidden group-hover:bg-gray-100 transition-colors">
                        {item.image_url ? (
                            <img src={item.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.name} />
                        ) : (
                            <div className="flex h-full items-center justify-center text-gray-300">
                                <Package className="w-16 h-16" />
                            </div>
                        )}
                        
                        {/* Quick Actions Overlay */}
                        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                            <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-800 hover:text-red-500 shadow-lg hover:scale-110 transition-transform">
                                <Heart className="w-5 h-5" />
                            </button>
                            <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-800 hover:text-primary shadow-lg hover:scale-110 transition-transform">
                                <Search className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Content */}
                    <div className="px-2 pb-2 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">{item.category}</span>
                            <div className="flex items-center gap-1 text-yellow-400 text-[10px] font-black">
                                <Star className="w-3 h-3 fill-current" /> 4.8
                            </div>
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mb-1 line-clamp-1 group-hover:text-primary transition-colors">{item.name}</h3>
                        
                        <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50">
                            <PriceTag amount={item.price} className="text-xl font-black text-gray-900" />
                            <Button size="sm" className="h-10 w-10 rounded-xl p-0 bg-gray-900 text-white hover:bg-primary transition-colors shadow-lg">
                                <ShoppingCart className="w-4 h-4" />
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
    </div>
  );
};
