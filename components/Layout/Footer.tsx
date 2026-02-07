
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Facebook, Instagram, Twitter, MapPin, Mail, Phone, ChevronLeft, HelpCircle, Linkedin } from 'lucide-react';
import { FooterConfig } from '../../types';

export const Footer: React.FC = () => {
  const [config, setConfig] = useState<FooterConfig>({
    app_section: {
        show: true,
        image_url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=600',
        title: 'حمل تطبيق القاعة',
        description: 'تجربة حجز أسرع وأسهل عبر تطبيق الجوال. متاح الآن لأجهزة الآيفون والأندرويد.',
        apple_store_link: '#',
        google_play_link: '#'
    },
    faq_section: {
        show: true,
        title: 'الأسئلة الشائعة',
        items: [
            { question: "كيف يمكنني حجز قاعة؟", answer: "يمكنك القيام بذلك بسهولة من خلال التطبيق أو الموقع الإلكتروني عبر خطوات بسيطة وميسرة." },
            { question: "هل يمكنني إلغاء الحجز؟", answer: "نعم، وفقاً لسياسة الإلغاء الخاصة بكل قاعة والموضحة في تفاصيل الحجز." }
        ]
    },
    contact_info: {
        phone: '920000000',
        email: 'support@hall.sa',
        address: 'الرياض، المملكة العربية السعودية',
        copyright_text: `© ${new Date().getFullYear()} شركة القاعة لتقنية المعلومات. جميع الحقوق محفوظة.`
    },
    social_links: { twitter: '#', instagram: '#', facebook: '#', linkedin: '#' }
  });

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
      if (data?.value?.footer_config) {
        setConfig(prev => ({ ...prev, ...data.value.footer_config }));
      }
    };
    fetchConfig();
  }, []);

  return (
    <footer className="font-sans bg-white">
      
      {/* 1. App Download Section (Taller, Wider, Flat) */}
      {config.app_section.show && (
        <section className="bg-white pt-24 border-t border-gray-100">
            <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
                <div className="bg-gray-900 rounded-[3rem] relative overflow-hidden flex flex-col md:flex-row items-center shadow-none min-h-[550px]">
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] -mr-40 -mt-40 pointer-events-none"></div>
                    
                    {/* Right: Image (Full Column, No Skew) */}
                    <div className="w-full md:w-1/2 h-full min-h-[400px] md:min-h-full relative order-2 md:order-1">
                        <img 
                            src={config.app_section.image_url || "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=800"} 
                            className="absolute inset-0 w-full h-full object-cover" 
                            alt="App Screen" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent md:bg-gradient-to-r"></div>
                    </div>

                    {/* Left: Text & Badges */}
                    <div className="w-full md:w-1/2 p-12 md:p-20 text-center md:text-right space-y-8 relative z-10 text-white order-1 md:order-2 flex flex-col justify-center">
                        <h2 className="text-4xl md:text-6xl font-black leading-tight tracking-tight">{config.app_section.title}</h2>
                        <p className="text-white/80 font-medium text-xl leading-relaxed max-w-lg ml-auto">{config.app_section.description}</p>
                        
                        <div className="flex flex-wrap justify-center md:justify-end gap-4 pt-4">
                            <a href={config.app_section.apple_store_link} target="_blank" rel="noreferrer" className="transition-transform hover:scale-105">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="Download on App Store" className="h-14" />
                            </a>
                            <a href={config.app_section.google_play_link} target="_blank" rel="noreferrer" className="transition-transform hover:scale-105">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" className="h-14" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
      )}

      {/* 2. FAQ Section (Flat, Light Purple) */}
      {config.faq_section.show && config.faq_section.items.length > 0 && (
        <section className="bg-primary/5 py-24 mt-24">
            <div className="max-w-4xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-16">
                    <span className="bg-white text-primary px-5 py-2 rounded-full text-xs font-black border border-primary/10">مساعدة</span>
                    <h2 className="text-4xl font-black text-gray-900 mt-6">{config.faq_section.title}</h2>
                </div>
                <div className="space-y-4">
                    {config.faq_section.items.map((item, i) => (
                        <details key={i} className="group bg-white border border-primary/5 rounded-[2rem] open:bg-white transition-all duration-300 cursor-pointer overflow-hidden">
                            <summary className="flex justify-between items-center p-8 font-bold text-lg text-gray-800 list-none hover:bg-gray-50 transition-colors select-none">
                                {item.question}
                                <div className="bg-gray-50 group-open:bg-primary group-open:text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors">
                                    <ChevronLeft className="w-5 h-5 group-open:-rotate-90 transition-transform" />
                                </div>
                            </summary>
                            <div className="px-8 pb-8 text-base text-gray-500 leading-loose border-t border-gray-50 pt-6">
                                {item.answer}
                            </div>
                        </details>
                    ))}
                </div>
            </div>
        </section>
      )}

      {/* 3. Main Footer Links (Flat) */}
      <div className="bg-white pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-12 mb-16 border-b border-gray-50 pb-16">
                {/* Brand */}
                <div className="md:col-span-1 space-y-8">
                    <div className="flex items-center gap-3">
                        <img src="https://dash.hall.sa/logo.svg" alt="Logo" className="h-16 w-auto" />
                        <span className="text-3xl font-ruqaa text-primary">القاعة</span>
                    </div>
                    <p className="text-sm text-gray-500 font-medium leading-loose">
                        منصتك الأولى لحجز قاعات الأفراح، الشاليهات، وكافة خدمات المناسبات في المملكة العربية السعودية.
                    </p>
                    <div className="flex gap-4">
                        {config.social_links.twitter && <a href={config.social_links.twitter} className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-black hover:text-white transition-all"><Twitter className="w-5 h-5" /></a>}
                        {config.social_links.instagram && <a href={config.social_links.instagram} className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-pink-600 hover:text-white transition-all"><Instagram className="w-5 h-5" /></a>}
                        {config.social_links.facebook && <a href={config.social_links.facebook} className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-blue-600 hover:text-white transition-all"><Facebook className="w-5 h-5" /></a>}
                        {config.social_links.linkedin && <a href={config.social_links.linkedin} className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-blue-700 hover:text-white transition-all"><Linkedin className="w-5 h-5" /></a>}
                    </div>
                </div>

                {/* Quick Links */}
                <div className="space-y-6">
                    <h4 className="font-black text-gray-900 text-xl">روابط سريعة</h4>
                    <ul className="space-y-4 text-sm text-gray-500 font-bold">
                        <li><a href="#" className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> عن المنصة</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> القاعات المميزة</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> انضم كشريك</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> المتجر</a></li>
                    </ul>
                </div>

                {/* Policies */}
                <div className="space-y-6">
                    <h4 className="font-black text-gray-900 text-xl">السياسات والدعم</h4>
                    <ul className="space-y-4 text-sm text-gray-500 font-bold">
                        <li><a href="#" className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> شروط الاستخدام</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> سياسة الخصوصية</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> اتفاقية مستوى الخدمة</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> مركز المساعدة</a></li>
                    </ul>
                </div>

                {/* Contact */}
                <div className="space-y-6">
                    <h4 className="font-black text-gray-900 text-xl">تواصل معنا</h4>
                    <ul className="space-y-5 text-sm text-gray-500 font-bold">
                        <li className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-primary"><Phone className="w-5 h-5" /></div> <span dir="ltr" className="text-lg">{config.contact_info.phone}</span></li>
                        <li className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-primary"><Mail className="w-5 h-5" /></div> {config.contact_info.email}</li>
                        <li className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-primary"><MapPin className="w-5 h-5" /></div> {config.contact_info.address}</li>
                    </ul>
                </div>
            </div>

            <div className="text-center">
                <p className="text-xs font-bold text-gray-400">{config.contact_info.copyright_text}</p>
            </div>
        </div>
      </div>
    </footer>
  );
};
