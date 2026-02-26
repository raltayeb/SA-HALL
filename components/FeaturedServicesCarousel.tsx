import React, { useState } from 'react';
import { Service } from '../types';
import { PriceTag } from './ui/PriceTag';
import { Sparkles, Star, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

interface FeaturedServicesCarouselProps {
  services: Service[];
  onNavigate: (tab: string, item: any) => void;
}

export const FeaturedServicesCarousel: React.FC<FeaturedServicesCarouselProps> = ({ services, onNavigate }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const visibleCount = 3;
  const totalSlides = Math.max(0, services.length - visibleCount);

  const nextSlide = () => {
    if (isAnimating || currentSlide >= totalSlides) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => prev + 1);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const prevSlide = () => {
    if (isAnimating || currentSlide <= 0) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => prev - 1);
    setTimeout(() => setIsAnimating(false), 300);
  };

  if (services.length === 0) return null;

  return (
    <div className="relative">
      {/* Carousel Container - Shows exactly 3 cards in a row */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(${currentSlide * (100 / visibleCount)}%)`,
          }}
        >
          {services.map((service) => (
            <div
              key={service.id}
              className="flex-shrink-0"
              style={{ width: `${100 / visibleCount}%` }}
            >
              <div
                onClick={() => onNavigate('hall_details', { item: service, type: 'service' })}
                className="group relative cursor-pointer overflow-hidden rounded-[2.5rem] h-[450px] bg-white shadow-lg mx-3"
              >
                <img
                  src={service.image_url || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800'}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  alt={service.name}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300"></div>

                <div className="absolute top-6 right-6 bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-black flex items-center gap-1 border border-white/30">
                  <Sparkles className="w-3 h-3" /> مميزة
                </div>

                <div className="absolute inset-x-0 bottom-0 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-black text-white truncate flex-1">{service.name}</h3>
                    <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full mr-3 shrink-0">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-black text-white">4.9</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/90">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm font-bold">{service.category}</span>
                    </div>
                    <div className="text-right">
                      <PriceTag amount={service.price} className="text-lg font-black text-white" />
                      <span className="text-[10px] text-white/70 font-bold">/ للخدمة</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows - Only show if more than 3 items */}
      {services.length > visibleCount && (
        <>
          <button
            onClick={nextSlide}
            disabled={currentSlide >= totalSlides}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm hover:bg-primary hover:text-white text-gray-700 p-3 rounded-full shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="التالي"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={prevSlide}
            disabled={currentSlide <= 0}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm hover:bg-primary hover:text-white text-gray-700 p-3 rounded-full shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="السابق"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Slide Indicators - Only show if more than 3 items */}
      {services.length > visibleCount && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalSlides + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                if (!isAnimating) {
                  setIsAnimating(true);
                  setCurrentSlide(i);
                  setTimeout(() => setIsAnimating(false), 300);
                }
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentSlide ? 'w-8 bg-primary' : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
