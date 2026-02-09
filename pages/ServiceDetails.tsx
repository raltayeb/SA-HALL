
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Service, UserProfile } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { ArrowRight, Sparkles, User, MessageCircle, Share2, Heart, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ServiceDetailsProps {
  item: Service & { vendor?: UserProfile };
  user: UserProfile | null;
  onBack: () => void;
}

export const ServiceDetails: React.FC<ServiceDetailsProps> = ({ item, user, onBack }) => {
  const [requestSent, setRequestSent] = useState(false);
  const { toast } = useToast();

  const handleRequest = async () => {
      try {
          await supabase.from('notifications').insert([{
              user_id: item.vendor_id,
              title: 'استفسار خدمة جديد',
              message: `استفسار من ${user?.full_name || 'زائر'} بخصوص خدمة ${item.name}`,
              type: 'system'
          }]);
          setRequestSent(true);
          toast({ title: 'تم الإرسال', description: 'وصل طلبك لمقدم الخدمة، سيتم التواصل معك.', variant: 'success' });
      } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-20 font-tajawal text-right" dir="rtl">
        
        {/* Navbar */}
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 py-4 shadow-sm">
            <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-900 font-bold hover:bg-gray-100 px-4 py-2 rounded-full transition-all">
                <ArrowRight className="w-5 h-5" /> خدمات
            </button>
            <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="rounded-full bg-white"><Share2 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="rounded-full bg-white"><Heart className="w-4 h-4" /></Button>
            </div>
            </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid lg:grid-cols-3 gap-8">
                
                {/* --- RIGHT COLUMN (Content) --- */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* 1. Hero Card */}
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm">
                        <div className="h-[400px] rounded-[2rem] overflow-hidden mb-6 relative bg-gray-100">
                            {item.image_url ? (
                                <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} />
                            ) : (
                                <div className="flex h-full items-center justify-center text-gray-300">
                                    <Sparkles className="w-20 h-20" />
                                </div>
                            )}
                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full font-black text-xs flex items-center gap-1 text-orange-600">
                                <Sparkles className="w-4 h-4" /> {item.category}
                            </div>
                        </div>
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-black text-gray-900">{item.name}</h1>
                                <p className="text-gray-500 font-bold mt-2 text-sm">مقدم الخدمة: {item.vendor?.business_name || 'شريك معتمد'}</p>
                            </div>
                            <div className="text-left">
                                <span className="text-[10px] font-bold text-gray-400 block mb-1">السعر المبدئي</span>
                                <PriceTag amount={item.price} className="text-2xl font-black text-orange-600" />
                            </div>
                        </div>
                    </div>

                    {/* 2. Description Card */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm space-y-6">
                        <h3 className="text-xl font-black text-gray-900">تفاصيل الخدمة</h3>
                        <p className="text-gray-600 leading-loose font-medium text-base">{item.description}</p>
                        
                        <div className="flex flex-wrap gap-3 pt-4">
                            <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-orange-100">
                                <CheckCircle2 className="w-4 h-4" /> خدمة موثقة
                            </div>
                            <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-orange-100">
                                <CheckCircle2 className="w-4 h-4" /> التزام بالمواعيد
                            </div>
                        </div>
                    </div>

                    {/* 3. Portfolio Placeholder (Simulated) */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm space-y-6">
                        <h3 className="text-xl font-black text-gray-900">معرض الأعمال</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="aspect-square bg-gray-100 rounded-2xl animate-pulse"></div>
                            <div className="aspect-square bg-gray-100 rounded-2xl animate-pulse"></div>
                            <div className="aspect-square bg-gray-100 rounded-2xl animate-pulse"></div>
                        </div>
                    </div>
                </div>

                {/* --- LEFT COLUMN (Sticky Sidebar) --- */}
                <div className="relative">
                    <div className="sticky top-28 bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-xl space-y-6">
                        <div className="text-center space-y-1 pb-4 border-b border-gray-50">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">تكلفة الخدمة</p>
                            <PriceTag amount={item.price} className="text-4xl font-black text-gray-900 justify-center" />
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-green-50 border border-green-100 text-green-700 text-sm font-bold">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm"><MessageCircle className="w-4 h-4" /></div>
                                <span>رد سريع (خلال ساعة)</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 text-sm font-bold">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm"><User className="w-4 h-4" /></div>
                                <span>فريق عمل احترافي</span>
                            </div>
                        </div>

                        <Button onClick={handleRequest} disabled={requestSent} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl bg-gray-900 text-white hover:bg-black transition-all active:scale-95">
                            {requestSent ? 'تم إرسال الطلب' : 'طلب عرض سعر'}
                        </Button>
                        
                        <p className="text-[10px] text-center text-gray-400 font-bold leading-relaxed">
                            سيتم إرسال طلبك لمقدم الخدمة للتواصل معك وتحديد التفاصيل النهائية.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};
