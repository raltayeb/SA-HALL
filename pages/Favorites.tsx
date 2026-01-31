
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Hall } from '../types';
import { Button } from '../components/ui/Button';
import { Heart, ImageOff, MapPin, Eye, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { PriceTag } from '../components/ui/PriceTag';

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

  if (loading) return <div className="p-12 text-center animate-pulse">جاري تحميل المفضلة...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black flex items-center gap-2"><Heart className="text-destructive fill-destructive" /> القاعات المفضلة</h2>
        <p className="text-sm text-muted-foreground">قائمتك المختصرة لأجمل قاعات المناسبات.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {favorites.map(hall => (
          <div key={hall.id} className="group overflow-hidden rounded-2xl border bg-card shadow-sm hover:shadow-xl transition-all relative">
             <button onClick={() => removeFavorite(hall.id)} className="absolute top-4 left-4 z-20 bg-white/90 p-2 rounded-full shadow hover:scale-110 transition-transform">
                <Trash2 className="w-4 h-4 text-destructive" />
             </button>
             <div className="aspect-video bg-muted relative overflow-hidden">
              {hall.image_url || (hall.images && hall.images[0]) ? (
                <img src={hall.image_url || hall.images[0]} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center opacity-20"><ImageOff className="h-10 h-10" /></div>
              )}
              <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-0.5 rounded text-[10px]">{hall.city}</div>
             </div>
             <div className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg">{hall.name}</h3>
                  <PriceTag amount={hall.price_per_night} className="text-primary" />
                </div>
                <div className="flex gap-2">
                   <Button variant="outline" className="flex-1 rounded-xl h-10 text-xs font-bold" onClick={() => window.dispatchEvent(new CustomEvent('openHall', { detail: hall }))}>عرض التفاصيل</Button>
                </div>
             </div>
          </div>
        ))}
        {favorites.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl opacity-50">
            <Heart className="w-12 h-12 mx-auto mb-4" />
            <p className="font-bold">قائمة المفضلة فارغة حالياً.</p>
          </div>
        )}
      </div>
    </div>
  );
};
