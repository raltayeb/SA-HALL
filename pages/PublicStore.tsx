
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { POSItem } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { Package, ShoppingBag, Loader2 } from 'lucide-react';

export const PublicStore: React.FC = () => {
  const [products, setProducts] = useState<POSItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F8F9FC] pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-16">
        
        {/* Header */}
        <div className="bg-gray-900 rounded-[3rem] p-12 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary rounded-full blur-[100px] opacity-50"></div>
            <div className="relative z-10 space-y-6">
                <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto backdrop-blur-md border border-white/10 text-white mb-6">
                    <ShoppingBag className="w-10 h-10" />
                </div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tight">متجر المنصة</h1>
                <p className="text-xl font-medium text-white/80 max-w-2xl mx-auto">
                    تجهيزات حصرية، معدات فاخرة، وباقات خاصة لشركائنا وعملائنا المميزين.
                </p>
            </div>
        </div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8">
            {products.map((item) => (
                <div key={item.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 hover:shadow-xl transition-all group flex flex-col text-center">
                    <div className="aspect-square bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6 group-hover:bg-primary/5 transition-colors relative overflow-hidden">
                        {item.image_url ? (
                            <img src={item.image_url} className="w-full h-full object-cover" />
                        ) : (
                            <Package className="w-16 h-16 text-gray-300 group-hover:text-primary transition-colors" />
                        )}
                        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-xl text-[10px] font-black shadow-sm">{item.stock} متوفر</div>
                    </div>
                    
                    <h3 className="text-xl font-black text-gray-900 mb-2 truncate">{item.name}</h3>
                    <p className="text-sm font-bold text-gray-400 mb-6">{item.category}</p>
                    
                    <div className="mt-auto space-y-4">
                        <PriceTag amount={item.price} className="justify-center text-2xl font-black text-primary" />
                        <Button className="w-full h-12 rounded-xl font-black bg-gray-900 text-white hover:bg-black shadow-lg">
                            شراء الآن
                        </Button>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
