
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ContentPage } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FileText, Save, Loader2, Globe, Eye, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const ContentCMS: React.FC = () => {
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<ContentPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchPages = async () => {
    setLoading(true);
    const { data } = await supabase.from('content_pages').select('*').order('slug');
    if (data) {
      setPages(data);
      if (!selectedPage && data.length > 0) setSelectedPage(data[0]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPages(); }, []);

  const handleSave = async () => {
    if (!selectedPage) return;
    setSaving(true);
    const { error } = await supabase
      .from('content_pages')
      .update({
        title: selectedPage.title,
        content: selectedPage.content,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedPage.id);

    if (!error) {
      toast({ title: 'تم الحفظ', description: 'تم تحديث المحتوى بنجاح', variant: 'success' });
      fetchPages();
    } else {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  if (loading) return <div className="p-20 text-center animate-pulse">جاري تحميل المحتوى...</div>;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6">
      <div className="flex justify-between items-center text-right shrink-0">
        <div>
           <h2 className="text-3xl font-ruqaa text-primary">إدارة المحتوى (CMS)</h2>
           <p className="text-sm text-muted-foreground mt-1">تعديل نصوص الصفحات، الشروط والأحكام، والواجهة الرئيسية.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="h-12 px-8 rounded-xl font-bold gap-2 shadow-xl shadow-primary/20">
           {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
           حفظ التعديلات
        </Button>
      </div>

      <div className="flex-1 grid lg:grid-cols-4 gap-8 min-h-0">
         {/* Sidebar List */}
         <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm overflow-y-auto no-scrollbar">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-4 text-right px-2">الصفحات المتاحة</h3>
            <div className="space-y-2">
               {pages.map(page => (
                 <button
                   key={page.id}
                   onClick={() => setSelectedPage(page)}
                   className={`w-full text-right px-4 py-4 rounded-xl transition-all font-bold text-sm flex items-center justify-between group ${
                     selectedPage?.id === page.id 
                     ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                     : 'hover:bg-gray-50 text-gray-600'
                   }`}
                 >
                   <span>{page.title}</span>
                   {selectedPage?.id === page.id && <CheckCircle2 className="w-4 h-4" />}
                 </button>
               ))}
            </div>
         </div>

         {/* Editor Area */}
         <div className="lg:col-span-3 bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm flex flex-col gap-6 overflow-y-auto">
            {selectedPage ? (
              <>
                 <div className="grid md:grid-cols-2 gap-6 text-right">
                    <Input 
                      label="عنوان الصفحة" 
                      value={selectedPage.title} 
                      onChange={e => setSelectedPage({...selectedPage, title: e.target.value})} 
                      className="text-right h-12 rounded-xl"
                    />
                    <div className="space-y-2">
                       <label className="text-sm font-medium leading-none">المعرف (Slug)</label>
                       <div className="flex h-12 w-full rounded-xl border bg-gray-50 px-3 py-1 items-center text-sm text-gray-500 font-mono" dir="ltr">
                          /{selectedPage.slug}
                       </div>
                    </div>
                 </div>

                 <div className="flex-1 space-y-2 text-right flex flex-col min-h-[300px]">
                    <label className="text-sm font-medium leading-none flex items-center justify-end gap-2">
                       محتوى الصفحة <FileText className="w-4 h-4 text-primary" />
                    </label>
                    <textarea 
                      className="flex-1 w-full rounded-xl border border-gray-200 bg-transparent px-4 py-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none resize-none leading-relaxed"
                      value={selectedPage.content}
                      onChange={e => setSelectedPage({...selectedPage, content: e.target.value})}
                      placeholder="اكتب المحتوى هنا..."
                    />
                    <p className="text-[10px] text-muted-foreground text-center">يدعم النص العادي وبعض تنسيقات HTML البسيطة.</p>
                 </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4">
                 <Globe className="w-16 h-16" />
                 <p className="font-bold">اختر صفحة من القائمة للبدء في التعديل</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};
