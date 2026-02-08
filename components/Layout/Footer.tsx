
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Facebook, Instagram, Twitter, MapPin, Mail, Phone, ChevronDown, Linkedin } from 'lucide-react';
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
        title: 'كل ما تحتاج معرفته عن الحجز معنا',
        items: [
            { question: "ما هي أوقات الدخول والخروج؟", answer: "تختلف المواعيد حسب القاعة، ولكن غالباً ما يبدأ الدخول من الساعة 4 عصراً والخروج في الساعة 12 منتصف الليل." },
            { question: "هل تقدمون خدمات النقل أو الاستقبال؟", answer: "نعم، بعض شركائنا يوفرون حافلات نقل الضيوف وسيارات استقبال خاصة." },
            { question: "هل يسمح بدخول الحيوانات الأليفة؟", answer: "يعتمد ذلك على سياسة القاعة أو الشاليه المختارة؛ يرجى مراجعة تفاصيل المكان." },
            { question: "هل تتوفر خدمة واي فاي مجانية؟", answer: "نعم، معظم القاعات توفر إنترنت عالي السرعة لضيوفها." },
            { question: "ما هي المرافق المتاحة للضيوف؟", answer: "تشمل المرافق غرف تبديل الملابس، أجنحة العروس، صالات الطعام، ومواقف السيارات." },
            { question: "هل يتوفر خيار تقديم الإفطار؟", answer: "نعم، في حال حجز الشاليهات أو المنتجعات لعدة أيام، يتوفر بوفيه إفطار حسب الطلب." }
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

  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
    <footer className="font-sans bg-[#F9FAFB]">
      
      {/* 1. App Download Section */}
      {config.app_section.show && (
        <section className="bg-[#F9FAFB] pt-24">
            <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
                <div className="bg-gray-900 rounded-[3rem] relative overflow-hidden flex flex-col md:flex-row items-center min-h-[550px]">
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] -mr-40 -mt-40 pointer-events-none"></div>
                    <div className="w-full md:w-1/2 h-full min-h-[400px] md:min-h-full relative order-2 md:order-1">
                        <img 
                            src={config.app_section.image_url || "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=800"} 
                            className="absolute inset-0 w-full h-full object-cover" 
                            alt="App Screen" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent md:bg-gradient-to-r"></div>
                    </div>
                    <div className="w-full md:w-1/2 p-12 md:p-20 text-center md:text-right space-y-6 relative z-10 text-white order-1 md:order-2 flex flex-col justify-center">
                        <h2 className="text-3xl md:text-4xl font-black leading-tight tracking-tight">{config.app_section.title}</h2>
                        <p className="text-white/80 font-medium text-lg leading-relaxed max-w-lg ml-auto">{config.app_section.description}</p>
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

      {/* 2. FAQ Section */}
      {config.faq_section.show && config.faq_section.items.length > 0 && (
        <section className="bg-[#F9FAFB] py-32 px-6 lg:px-20">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-16 lg:gap-24 text-right">
                
                {/* Left Side: Title Section */}
                <div className="md:w-1/2 space-y-4">
                    <span className="text-[#B48C5E] text-sm font-black uppercase tracking-widest">FAQ</span>
                    <h2 className="text-3xl md:text-4xl font-black text-[#111827] leading-tight">
                        {config.faq_section.title}
                    </h2>
                </div>

                {/* Right Side: Accordion Section */}
                <div className="md:w-1/2">
                    <div className="border-t border-gray-200">
                        {config.faq_section.items.map((item, i) => (
                            <div key={i} className="border-b border-gray-200">
                                <button 
                                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                    className="w-full py-7 flex justify-between items-center text-right group focus:outline-none"
                                >
                                    <span className="text-xl font-bold text-[#111827] group-hover:text-gray-600 transition-colors">
                                        {item.question}
                                    </span>
                                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''}`} />
                                </button>
                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === i ? 'max-h-96 pb-8 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <p className="text-lg text-gray-500 font-medium leading-relaxed">
                                        {item.answer}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </section>
      )}

      {/* 3. Main Footer Links */}
      <div className="bg-white pt-20 pb-10 border-t border-gray-100">
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
                        <li><a href="#" className="hover:text-primary transition-colors">عن المنصة</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">القاعات المميزة</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">انضم كشريك</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">المتجر</a></li>
                    </ul>
                </div>

                {/* Policies */}
                <div className="space-y-6">
                    <h4 className="font-black text-gray-900 text-xl">السياسات والدعم</h4>
                    <ul className="space-y-4 text-sm text-gray-500 font-bold">
                        <li><a href="#" className="hover:text-primary transition-colors">شروط الاستخدام</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">سياسة الخصوصية</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">اتفاقية مستوى الخدمة</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">مركز المساعدة</a></li>
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
