import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ContentPage } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import {
  FileText, Save, Loader2, Globe, Eye, CheckCircle2, Megaphone, Plus,
  Trash2, Edit3, Image as ImageIcon, Link as LinkIcon, Users, Tag
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface PopupAnnouncement {
  id: string;
  title: string;
  content: string;
  image_url: string;
  button_text: string;
  button_link: string;
  is_active: boolean;
  show_on_load: boolean;
  priority: number;
  target_audience: 'all' | 'users' | 'vendors';
  created_at: string;
}

export const ContentCMS: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pages' | 'announcements'>('pages');
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<ContentPage | null>(null);
  const [announcements, setAnnouncements] = useState<PopupAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Partial<PopupAnnouncement>>({
    title: '',
    content: '',
    image_url: '',
    button_text: 'إغلاق',
    button_link: '',
    is_active: true,
    show_on_load: true,
    priority: 0,
    target_audience: 'all'
  });
  const { toast } = useToast();

  const fetchPages = async () => {
    const { data } = await supabase.from('content_pages').select('*').order('slug');
    if (data) {
      setPages(data);
      if (!selectedPage && data.length > 0) setSelectedPage(data[0]);
    }
  };

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('popup_announcements')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });
    setAnnouncements(data || []);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPages(), fetchAnnouncements()]).then(() => setLoading(false));
  }, []);

  const handleSavePage = async () => {
    if (!selectedPage) return;
    setSaving(true);
    const { error } = await supabase
      .from('content_pages')
      .update({
        title: selectedPage.title,
        content: selectedPage.content,
        updated_at: new Date().toISOString()
      })
      .eq('selectedPage.id', selectedPage.id);

    if (!error) {
      toast({ title: 'تم الحفظ', description: 'تم تحديث المحتوى بنجاح', variant: 'success' });
      fetchPages();
    } else {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleSaveAnnouncement = async () => {
    if (!currentAnnouncement.title) {
      toast({ title: 'خطأ', description: 'العنوان مطلوب', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (currentAnnouncement.id) {
        const { error } = await supabase
          .from('popup_announcements')
          .update({
            title: currentAnnouncement.title,
            content: currentAnnouncement.content,
            image_url: currentAnnouncement.image_url,
            button_text: currentAnnouncement.button_text,
            button_link: currentAnnouncement.button_link,
            is_active: currentAnnouncement.is_active,
            show_on_load: currentAnnouncement.show_on_load,
            priority: currentAnnouncement.priority,
            target_audience: currentAnnouncement.target_audience,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentAnnouncement.id);

        if (error) throw error;
        toast({ title: 'تم التحديث', description: 'تم تحديث الإعلان بنجاح', variant: 'success' });
      } else {
        const { error } = await supabase
          .from('popup_announcements')
          .insert([{
            title: currentAnnouncement.title,
            content: currentAnnouncement.content,
            image_url: currentAnnouncement.image_url,
            button_text: currentAnnouncement.button_text,
            button_link: currentAnnouncement.button_link,
            is_active: currentAnnouncement.is_active,
            show_on_load: currentAnnouncement.show_on_load,
            priority: currentAnnouncement.priority || 0,
            target_audience: currentAnnouncement.target_audience || 'all'
          }]);

        if (error) throw error;
        toast({ title: 'تم الإضافة', description: 'تمت إضافة الإعلان بنجاح', variant: 'success' });
      }

      setIsAnnouncementModalOpen(false);
      setCurrentAnnouncement({
        title: '',
        content: '',
        image_url: '',
        button_text: 'إغلاق',
        button_link: '',
        is_active: true,
        show_on_load: true,
        priority: 0,
        target_audience: 'all'
      });
      fetchAnnouncements();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإعلان؟')) return;

    const { error } = await supabase.from('popup_announcements').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'تم الحذف', description: 'تم حذف الإعلان بنجاح', variant: 'success' });
    fetchAnnouncements();
  };

  const handleEditAnnouncement = (announcement: PopupAnnouncement) => {
    setCurrentAnnouncement(announcement);
    setIsAnnouncementModalOpen(true);
  };

  if (loading) return <div className="p-20 text-center animate-pulse">جاري تحميل المحتوى...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-ruqaa text-primary">إدارة المحتوى</h2>
            <p className="text-gray-500 font-bold text-sm">الصفحات والمحتوى التسويقي</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('pages')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'pages'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            الصفحات
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'announcements'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            الإعلانات
          </button>
        </div>
      </div>

      {/* Pages Tab */}
      {activeTab === 'pages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pages List */}
          <div className="lg:col-span-1 space-y-2">
            {pages.map(page => (
              <button
                key={page.id}
                onClick={() => setSelectedPage(page)}
                className={`w-full p-4 rounded-2xl border text-right transition-all ${
                  selectedPage?.id === page.id
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-gray-100 bg-white hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-gray-900">{page.title}</p>
                    <p className="text-xs text-gray-500 mt-1">/{page.slug}</p>
                  </div>
                  {page.is_published && (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Editor */}
          <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            {selectedPage ? (
              <div className="space-y-4">
                <Input
                  label="العنوان"
                  value={selectedPage.title}
                  onChange={e => setSelectedPage({ ...selectedPage, title: e.target.value })}
                />
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">المحتوى</label>
                  <textarea
                    value={selectedPage.content}
                    onChange={e => setSelectedPage({ ...selectedPage, content: e.target.value })}
                    className="w-full p-4 rounded-xl border border-gray-200 focus:border-primary focus:outline-none min-h-[400px] font-mono text-sm"
                  />
                </div>
                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={handleSavePage} disabled={saving} className="flex-1 gap-2">
                    {saving ? <Loader2 className="animate-spin" /> : <><Save className="w-4 h-4" /> حفظ</>}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-20 text-center text-gray-500">اختر صفحة للتعديل</div>
            )}
          </div>
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-700">قائمة الإعلانات</h3>
            <Button onClick={() => setIsAnnouncementModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة إعلان
            </Button>
          </div>

          <div className="grid gap-4">
            {announcements.length === 0 ? (
              <div className="bg-gray-50 p-8 rounded-2xl text-center text-gray-500 font-bold">
                لا توجد إعلانات مضافة
              </div>
            ) : (
              announcements.map(announcement => (
                <div
                  key={announcement.id}
                  className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-bold text-gray-900">{announcement.title}</h4>
                        <Badge variant={announcement.is_active ? 'success' : 'default'}>
                          {announcement.is_active ? 'نشط' : 'غير نشط'}
                        </Badge>
                        {announcement.show_on_load && (
                          <Badge variant="default">يظهر عند التحميل</Badge>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{announcement.content}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {announcement.target_audience === 'all' ? 'الجميع' :
                           announcement.target_audience === 'users' ? 'المستخدمين فقط' : 'البائعين فقط'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          الأولوية: {announcement.priority}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditAnnouncement(announcement)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                  {announcement.image_url && (
                    <img
                      src={announcement.image_url}
                      alt={announcement.title}
                      className="mt-4 w-full h-48 object-cover rounded-xl"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      <Modal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        title={currentAnnouncement.id ? 'تعديل الإعلان' : 'إضافة إعلان جديد'}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <Input
            label="العنوان"
            value={currentAnnouncement.title || ''}
            onChange={e => setCurrentAnnouncement({ ...currentAnnouncement, title: e.target.value })}
            placeholder="عنوان الإعلان"
          />

          <textarea
            value={currentAnnouncement.content || ''}
            onChange={e => setCurrentAnnouncement({ ...currentAnnouncement, content: e.target.value })}
            placeholder="محتوى الإعلان"
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-primary focus:outline-none min-h-[100px]"
          />

          <Input
            label="رابط الصورة"
            value={currentAnnouncement.image_url || ''}
            onChange={e => setCurrentAnnouncement({ ...currentAnnouncement, image_url: e.target.value })}
            placeholder="https://example.com/image.jpg"
            icon={<ImageIcon className="w-4 h-4" />}
          />

          {currentAnnouncement.image_url && (
            <img
              src={currentAnnouncement.image_url}
              alt="معاينة"
              className="w-full h-48 object-cover rounded-xl"
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="نص الزر"
              value={currentAnnouncement.button_text || ''}
              onChange={e => setCurrentAnnouncement({ ...currentAnnouncement, button_text: e.target.value })}
              placeholder="إغلاق"
            />
            <Input
              label="رابط الزر"
              value={currentAnnouncement.button_link || ''}
              onChange={e => setCurrentAnnouncement({ ...currentAnnouncement, button_link: e.target.value })}
              placeholder="https://..."
              icon={<LinkIcon className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">الأولوية</label>
              <Input
                type="number"
                value={currentAnnouncement.priority || 0}
                onChange={e => setCurrentAnnouncement({ ...currentAnnouncement, priority: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">الجمهور المستهدف</label>
              <select
                value={currentAnnouncement.target_audience || 'all'}
                onChange={e => setCurrentAnnouncement({ ...currentAnnouncement, target_audience: e.target.value as any })}
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-primary focus:outline-none"
              >
                <option value="all">الجميع</option>
                <option value="users">المستخدمين فقط</option>
                <option value="vendors">البائعين فقط</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={currentAnnouncement.is_active}
                onChange={e => setCurrentAnnouncement({ ...currentAnnouncement, is_active: e.target.checked })}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm font-bold text-gray-700">نشط</span>
            </label>
            <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={currentAnnouncement.show_on_load}
                onChange={e => setCurrentAnnouncement({ ...currentAnnouncement, show_on_load: e.target.checked })}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm font-bold text-gray-700">يظهر عند التحميل</span>
            </label>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSaveAnnouncement} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="animate-spin" /> : 'حفظ'}
            </Button>
            <Button onClick={() => setIsAnnouncementModalOpen(false)} variant="outline">
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
