
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '../components/ui/Button';
import { ArrowRight, FileText, Shield, Heart, Phone, Info } from 'lucide-react';

interface LegalPageProps {
  pageType: 'terms' | 'privacy' | 'sla' | 'help' | 'about';
  onBack: () => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({ pageType, onBack }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, [pageType]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('legal_pages')
        .select('content')
        .eq('page_type', pageType)
        .eq('is_active', true)
        .maybeSingle();

      if (data?.content) {
        setContent(data.content);
      } else {
        // Default content if not set
        setContent(getDefaultContent(pageType));
      }
    } catch (err) {
      console.error(err);
      setContent(getDefaultContent(pageType));
    } finally {
      setLoading(false);
    }
  };

  const getDefaultContent = (type: string) => {
    const contents: Record<string, string> = {
      terms: `
        <h1>شروط الاستخدام</h1>
        <h2>1. قبول الشروط</h2>
        <p>باستخدامك لمنصة "القاعة"، فإنك توافق على الالتزام بهذه الشروط والأحكام.</p>
        
        <h2>2. تعريف المنصة</h2>
        <p>منصة "القاعة" هي منصة إلكترونية تربط بين أصحاب القاعات والخدمات والعملاء.</p>
        
        <h2>3. الاشتراكات</h2>
        <p>الاشتراك في المنصة يكون لمدة غير محددة (مدى الحياة) بعد دفع الرسوم لمرة واحدة.</p>
        
        <h2>4. المسؤوليات</h2>
        <p>المنصة غير مسؤولة عن أي نزاعات بين العملاء ومقدمي الخدمات.</p>
        
        <h2>5. التعديلات</h2>
        <p>يحق للإدارة تعديل الشروط في أي وقت مع إشعار المستخدمين.</p>
      `,
      privacy: `
        <h1>سياسة الخصوصية</h1>
        <h2>1. جمع البيانات</h2>
        <p>نجمع البيانات الشخصية اللازمة لتقديم الخدمة مثل الاسم والبريد الإلكتروني ورقم الجوال.</p>
        
        <h2>2. استخدام البيانات</h2>
        <p>تُستخدم البيانات للتواصل معك وإتمام الحجوزات وتحسين الخدمة.</p>
        
        <h2>3. حماية البيانات</h2>
        <p>نتخذ جميع الإجراءات الأمنية اللازمة لحماية بياناتك الشخصية.</p>
        
        <h2>4. مشاركة البيانات</h2>
        <p>لا نشارك بياناتك مع أطراف ثالثة إلا بموافقتك أو للضرورة القانونية.</p>
        
        <h2>5. حقوقك</h2>
        <p>لك الحق في الوصول إلى بياناتك أو تصحيحها أو حذفها في أي وقت.</p>
      `,
      sla: `
        <h1>اتفاقية مستوى الخدمة (SLA)</h1>
        <h2>1. نسبة التوفر</h2>
        <p>نلتزم بتوفر المنصة بنسبة 99% خلال الشهر.</p>
        
        <h2>2. وقت الاستجابة</h2>
        <p>نلتزم بالرد على الاستفسارات خلال 24 ساعة عمل.</p>
        
        <h2>3. الصيانة</h2>
        <p>يتم إشعار المستخدمين قبل أي صيانة مجدولة بـ 48 ساعة على الأقل.</p>
        
        <h2>4. التعويضات</h2>
        <p>في حال انخفاض التوفر عن 99%، يتم تعويض المشتركين بتمديد فترة الاشتراك.</p>
        
        <h2>5. الدعم الفني</h2>
        <p>يتوفر الدعم الفني عبر البريد الإلكتروني وواتساب خلال ساعات العمل.</p>
      `,
      help: `
        <h1>مركز المساعدة</h1>
        <h2>الأسئلة الشائعة</h2>
        
        <h3>كيف أسجل في المنصة؟</h3>
        <p>اضغط على "بوابة الأعمال" ثم "انضم كشريك الآن" واتبع الخطوات.</p>
        
        <h3>ما هي رسوم الاشتراك؟</h3>
        <p>القاعات: 500 ر.س | الخدمات: 200 ر.س (لمرة واحدة مدى الحياة)</p>
        
        <h3>كيف أضيف قاعة جديدة؟</h3>
        <p>بعد الاشتراك، ستوجه إلى صفحة إضافة القاعة لملء البيانات.</p>
        
        <h3>كيف أحجز قاعة؟</h3>
        <p>تصفح القاعات في الصفحة الرئيسية، اختر القاعة، ثم احجز التاريخ المطلوب.</p>
        
        <h2>تواصل معنا</h2>
        <p>البريد: support@hall.sa | واتساب: 966500000000+</p>
      `,
      about: `
        <h1>عن المنصة</h1>
        <h2>من نحن</h2>
        <p>"القاعة" هي منصة سعودية متخصصة في حجز القاعات والخدمات للمناسبات.</p>
        
        <h2>رؤيتنا</h2>
        <p>أن نكون المنصة الأولى في المملكة لحجز مناسباتك.</p>
        
        <h2>رسالتنا</h2>
        <p>تسهيل عملية حجز القاعات والخدمات بجودة عالية وأسعار منافسة.</p>
        
        <h2>قيمنا</h2>
        <ul>
          <li>الجودة والتميز</li>
          <li>الشفافية والثقة</li>
          <li>الابتكار المستمر</li>
          <li>رضا العملاء</li>
        </ul>
        
        <h2>تواصل معنا</h2>
        <p>البريد: info@hall.sa</p>
      `
    };
    return contents[type] || '';
  };

  const pageInfo = {
    terms: { title: 'شروط الاستخدام', icon: FileText, color: 'text-blue-600' },
    privacy: { title: 'سياسة الخصوصية', icon: Shield, color: 'text-green-600' },
    sla: { title: 'اتفاقية مستوى الخدمة', icon: Heart, color: 'text-purple-600' },
    help: { title: 'مركز المساعدة', icon: Phone, color: 'text-orange-600' },
    about: { title: 'عن المنصة', icon: Info, color: 'text-primary' }
  };

  const PageIcon = pageInfo[pageType].icon;

  return (
    <div className="min-h-screen bg-gray-50 font-tajawal" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
            <span className="font-bold text-sm">عودة</span>
          </button>
          <div className="flex items-center gap-3">
            <PageIcon className={`w-6 h-6 ${pageInfo[pageType].color}`} />
            <h1 className="text-xl font-black text-gray-900">{pageInfo[pageType].title}</h1>
          </div>
          <div className="w-20"></div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] border border-gray-200 p-8 md:p-12 prose prose-lg max-w-none">
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        )}
      </div>
    </div>
  );
};
