
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ServiceCategory } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Layers, Plus, Edit, Trash2, Loader2, Save } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const ServiceCategories: React.FC = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Partial<ServiceCategory>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('service_categories').select('*').order('name');
    if (!error && data) {
      setCategories(data);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSave = async () => {
    if (!currentCategory.name) return;
    setSaving(true);
    
    const { error } = currentCategory.id 
      ? await supabase.from('service_categories').update({ name: currentCategory.name, icon: currentCategory.icon }).eq('id', currentCategory.id)
      : await supabase.from('service_categories').insert([{ name: currentCategory.name, icon: currentCategory.icon }]);

    if (!error) {
      toast({ title: 'تم الحفظ', variant: 'success' });
      setIsModalOpen(false);
      fetchCategories();
    } else {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد؟ سيؤثر هذا على الخدمات المرتبطة بهذا التصنيف.')) return;
    const { error } = await supabase.from('service_categories').delete().eq('id', id);
    if (!error) {
      toast({ title: 'تم الحذف', variant: 'success' });
      fetchCategories();
    }
  };

  return (
    <div className="space-y-6 text-right">
      <div className="flex justify-between items-center flex-row-reverse">
        <div>
          <h2 className="text-3xl font-ruqaa text-primary">تصنيفات الخدمات</h2>
          <p className="text-sm text-muted-foreground mt-1">إدارة القائمة المنسدلة لخدمات البائعين.</p>
        </div>
        <Button onClick={() => { setCurrentCategory({}); setIsModalOpen(true); }} className="h-12 px-6 rounded-xl font-bold gap-2">
           تصنيف جديد <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
           Array.from({length: 3}).map((_, i) => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-[2rem]"></div>)
        ) : categories.map(cat => (
           <div key={cat.id} className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm flex justify-between items-center flex-row-reverse">
              <div className="flex items-center gap-3 flex-row-reverse">
                 <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary">
                    <Layers className="w-5 h-5" />
                 </div>
                 <h3 className="font-bold text-lg">{cat.name}</h3>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => { setCurrentCategory(cat); setIsModalOpen(true); }} className="p-2 text-gray-400 hover:text-primary transition-colors"><Edit className="w-4 h-4" /></button>
                 <button onClick={() => handleDelete(cat.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
           </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentCategory.id ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}>
         <div className="space-y-6 text-right">
            <Input 
              label="اسم التصنيف" 
              placeholder="مثال: تصوير جوي"
              value={currentCategory.name || ''} 
              onChange={e => setCurrentCategory({...currentCategory, name: e.target.value})} 
              className="h-12 rounded-xl text-right"
            />
            <Button onClick={handleSave} disabled={saving} className="w-full h-12 rounded-xl font-bold gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ
            </Button>
         </div>
      </Modal>
    </div>
  );
};
