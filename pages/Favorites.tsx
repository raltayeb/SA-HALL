
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Hall } from '../types';
import { Button } from '../components/ui/Button';
import { Heart, ImageOff, MapPin, Eye, Trash2, Star, Users } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { PriceTag, SaudiRiyalIcon } from '../components/ui/PriceTag';

export const Favorites: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [favorites, setFavorites] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFavorites = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_favorites')
      .select('halls(*)')
      .eq('user_id', user.id);
    
    if (data) setFavorites(data.map(f => f.halls) as any);
    setLoading(false);
  };

  useEffect(() => { fetchFavorites(); }, [user.id]);

  const removeFavorite = async (hallId: string) => {
    const { error } = await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('hall_id', hallId);
    if (!error) {
      setFavorites(prev => prev.filter(h => h.id !== hallId));
      toast({ title: 'تمت الإزالة', variant: 'default' });
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse flex justify-center"><div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-primary animate-spin"></div></div>;

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      <div className="flex justify-between items-center text-right">
        <div>
            <h2 className="text-3xl font-black flex items-center gap-3 justify-end"><Heart className="text-red-500 fill-red-500 w-8 h-8" /> القاعات المفضلة</h2>
            <p className="text-sm text-muted-foreground mt-1 font-bold">قائمتك المختصرة لأجمل قاعات المناسبات.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 font-black text-sm shadow-sm">{favorites.length} قاعات</div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {favorites.map(hall => (
          <div key={hall.id} className="group bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden hover:shadow-2xl transition-all duration-500 relative">
             <div className="relative aspect-[4/3] overflow-hidden">
                <button 
                    onClick={(e) => { e.stopPropagation(); removeFavorite(hall.id); }} 
                    className="absolute top-4 left-4 z-20 bg-white/90 p-2.5 rounded-xl shadow-lg hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
                {hall.image_url ? (
                    <img src={hall.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center opacity-10 bg-gray-100"><ImageOff className="h-12 h-12" /></div>
                )}
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-black shadow-sm flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary" /> {hall.city}
                </div>
             </div>

             <div className="p-6 space-y-4 text-right">
                <div className="flex justify-between items-start flex-row-reverse">
                    <h3 className="text-xl font-black text-gray-900 group-hover:text-primary transition-colors line-clamp-1">{hall.name}</h3>
                    <div className="flex items-center gap-1 text-primary text-lg font-black">
                        {new Intl.NumberFormat('en-US').format(hall.price_per_night)} <span className="text-[10px] pt-1">SAR</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center justify-end gap-2 text-[10px] font-black text-gray-400 bg-gray-50 p-2 rounded-xl">
                        {hall.capacity} ضيف <Users className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-center justify-end gap-2 text-[10px] font-black text-gray-400 bg-gray-50 p-2 rounded-xl">
                        4.9 تقييم <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                    </div>
                </div>

                <Button 
                    className="w-full rounded-2xl h-12 font-black shadow-lg shadow-primary/20 mt-2" 
                    onClick={() => window.dispatchEvent(new CustomEvent('openHall', { detail: hall }))}
                >
                    عرض التفاصيل
                </Button>
             </div>
          </div>
        ))}
        {favorites.length === 0 && (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-gray-200 rounded-[3rem] opacity-60 bg-gray-50">
            <Heart className="w-16 h-16 mx-auto mb-6 text-gray-300" />
            <p className="font-bold text-xl text-gray-400">قائمة المفضلة فارغة حالياً.</p>
            <p className="text-sm text-gray-300 mt-2 font-bold">تصفح القاعات وأضف ما يعجبك هنا.</p>
          </div>
        )}
      </div>
    </div>
  );
};
