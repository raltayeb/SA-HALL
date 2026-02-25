import React from 'react';
import { Hall } from '../types';
import { PriceTag } from './ui/PriceTag';
import { Sparkles, Star, MapPin } from 'lucide-react';

interface FeaturedHallsCarouselProps {
  halls: Hall[];
  onNavigate: (tab: string, item: any) => void;
}

export const FeaturedHallsCarousel: React.FC<FeaturedHallsCarouselProps> = ({ halls, onNavigate }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {halls.map((hall) => (
        <div
          key={hall.id}
          onClick={() => onNavigate('hall_details', { item: hall, type: 'hall' })}
          className="group relative cursor-pointer overflow-hidden rounded-[2.5rem] h-[450px] bg-white shadow-lg"
        >
          <img
            src={hall.image_url || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800'}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            alt={hall.name}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300"></div>

          <div className="absolute top-6 right-6 bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-black flex items-center gap-1 border border-white/30">
            <Sparkles className="w-3 h-3" /> مميزة
          </div>

          <div className="absolute inset-x-0 bottom-0 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-black text-white truncate flex-1">{hall.name}</h3>
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full mr-3 shrink-0">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-black text-white">4.9</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/90">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-bold">{hall.city}</span>
              </div>
              <div className="text-right">
                <PriceTag amount={hall.price_per_night} className="text-lg font-black text-white" />
                <span className="text-[10px] text-white/70 font-bold">/ لليلة</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
