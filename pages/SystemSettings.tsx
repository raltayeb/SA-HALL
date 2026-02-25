import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { SystemSettings as ISystemSettings, FAQItem, ThemeConfig } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import {
  Settings, Save, Landmark, Coins, Building2, Sparkles, Loader2, CreditCard,
  Wallet, ShieldCheck, Globe, LayoutTemplate, HelpCircle, Plus, Trash2, Smartphone, Upload, Check,
  CalendarClock, Palette, Type, MousePointer, Tags, Edit3
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  is_active: boolean;
  created_at: string;
}

export const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'booking' | 'footer' | 'payment' | 'theme' | 'categories'>('general');
  const [settings, setSettings] = useState<ISystemSettings>({
    site_name: 'القاعة',
    commission_rate: 0.10,
    vat_enabled: true,
    platform_logo_url: '',
    hall_listing_fee: 500,
    service_listing_fee: 200,
    booking_config: {
        deposit_fixed: 500,
        deposit_percent: 20,
        hold_price: 200,
        consultation_price: 150
    },
    theme_config: {
        primaryColor: '#4B0082',
        secondaryColor: '#F3E8FF',
        backgroundColor: '#FFFFFF',
        sidebarColor: '#FFFFFF',
        borderRadius: '1rem',
        headingFont: 'Tajawal',
        bodyFont: 'Tajawal'
    },
    footer_config: {
      app_section: {
        show: true,
        image_url: '',
        title: 'حمل تطبيق القاعة',
        description: 'تجربة حجز أسرع وأسهل عبر تطبيق الجوال. متاح الآن لأجهزة الآيفون والأندرويد.',
        apple_store_link: '#',
        google_play_link: '#'
    },
      faq_section: {
        show: true,
        title: 'الأسئلة الشائعة',
        items: []
      },
      contact_info: {
        phone: '920000000',
        email: 'support@hall.sa',
        address: 'الرياض، المملكة العربية السعودية',
        copyright_text: '© 2025 شركة القاعة لتقنية المعلومات. جميع الحقوق محفوظة.'
      },
      social_links: {
        twitter: '#',
        instagram: '#',
        facebook: '#',
        linkedin: '#'
      }
    },
    payment_gateways: {
      visa_enabled: true,
      cash_enabled: true,
      hyperpay_enabled: false,
      hyperpay_entity_id: '',
      hyperpay_access_token: '',
      hyperpay_base_url: 'https://eu-test.oppwa.com',
      hyperpay_mode: 'test'
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Partial<ServiceCategory>>({
    name: '',
    description: '',
    icon_url: '',
    is_active: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSettings = async () => {
    const { data } = await supabase.from('system_settings').select('*');
    if (data) {
      const merged = data.reduce((acc, row) => {
        if (row.key === 'platform_config') acc.platform_logo_url = row.value;
        if (row.key === 'commission_rate') acc.commission_rate = row.value;
        if (row.key === 'booking_config') acc.booking_config = row.value;
        if (row.key === 'theme_config') acc.theme_config = row.value;
        if (row.key === 'footer_config') acc.footer_config = row.value;
        if (row.key === 'payment_gateways') acc.payment_gateways = row.value;
        return acc;
      }, {} as any);
      setSettings(prev => ({ ...prev, ...merged }));
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('service_categories')
      .select('*')
      .order('name');
    setCategories(data || []);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSettings(), fetchCategories()]).then(() => setLoading(false));
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    const updates = [
      supabase.from('system_settings').upsert({ key: 'platform_config', value: settings.platform_logo_url }),
      supabase.from('system_settings').upsert({ key: 'commission_rate', value: settings.commission_rate }),
      supabase.from('system_settings').upsert({ key: 'booking_config', value: settings.booking_config }),
      supabase.from('system_settings').upsert({ key: 'theme_config', value: settings.theme_config }),
      supabase.from('system_settings').upsert({ key: 'footer_config', value: settings.footer_config }),
      supabase.from('system_settings').upsert({ key: 'payment_gateways', value: settings.payment_gateways })
    ];
    await Promise.all(updates);
    setSaving(false);
    toast({ title: 'تم الحفظ', description: 'تم حفظ الإعدادات بنجاح', variant: 'success' });
  };

  const handleSaveCategory = async () => {
    if (!currentCategory.name) {
      toast({ title: 'خطأ', description: 'اسم التصنيف مطلوب', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (currentCategory.id) {
        const { error } = await supabase
          .from('service_categories')
          .update({
            name: currentCategory.name,
            description: currentCategory.description,
            icon_url: currentCategory.icon_url,
            is_active: currentCategory.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentCategory.id);
        if (error) throw error;
        toast({ title: 'تم التحديث', description: 'تم تحديث التصنيف بنجاح', variant: 'success' });
      } else {
        const { error } = await supabase
          .from('service_categories')
          .insert([{
            name: currentCategory.name,
            description: currentCategory.description || '',
            icon_url: currentCategory.icon_url || '',
            is_active: currentCategory.is_active ?? true
          }]);
        if (error) throw error;
        toast({ title: 'تم الإضافة', description: 'تمت إضافة التصنيف بنجاح', variant: 'success' });
      }

      setIsCategoryModalOpen(false);
      setCurrentCategory({ name: '', description: '', icon_url: '', is_active: true });
      fetchCategories();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التصنيف؟')) return;

    const { error } = await supabase.from('service_categories').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'تم الحذف', description: 'تم حذف التصنيف بنجاح', variant: 'success' });
    fetchCategories();
  };

  const handleEditCategory = (category: ServiceCategory) => {
    setCurrentCategory(category);
    setIsCategoryModalOpen(true);
  };

  const { toast } = useToast();

  if (loading) return <div className="p-20 text-center animate-pulse">جاري تحميل الإعدادات...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-ruqaa text-primary">إعدادات النظام</h2>
              <p className="text-gray-500 font-bold text-sm">التحكم الكامل في إعدادات المنصة</p>
            </div>
          </div>
          <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="animate-spin" /> : <><Save className="w-4 h-4" /> حفظ</>}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'general'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <Landmark className="w-4 h-4 inline-block ml-1" />
            العامة
          </button>
          <button
            onClick={() => setActiveTab('booking')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'booking'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <CalendarClock className="w-4 h-4 inline-block ml-1" />
            الحجوزات
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'payment'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <CreditCard className="w-4 h-4 inline-block ml-1" />
            الدفع
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'theme'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <Palette className="w-4 h-4 inline-block ml-1" />
            المظهر
          </button>
          <button
            onClick={() => setActiveTab('footer')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'footer'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <Globe className="w-4 h-4 inline-block ml-1" />
            التذييل
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <Tags className="w-4 h-4 inline-block ml-1" />
            التصنيفات
          </button>
        </div>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-700">تصنيفات الخدمات</h3>
            <Button onClick={() => setIsCategoryModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة تصنيف
            </Button>
          </div>

          <div className="grid gap-4">
            {categories.length === 0 ? (
              <div className="bg-gray-50 p-8 rounded-2xl text-center text-gray-500 font-bold">
                لا توجد تصنيفات مضافة
              </div>
            ) : (
              categories.map(category => (
                <div
                  key={category.id}
                  className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    {category.icon_url && (
                      <img src={category.icon_url} alt={category.name} className="w-10 h-10 rounded-xl object-cover" />
                    )}
                    <div>
                      <h4 className="font-bold text-gray-900">{category.name}</h4>
                      <p className="text-sm text-gray-500">{category.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={category.is_active ? 'success' : 'default'}>
                      {category.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Other tabs remain the same - keeping existing code for general, booking, payment, theme, footer */}
      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-gray-700 mb-4">الإعدادات العامة</h3>
          <Input
            label="اسم المنصة"
            value={settings.site_name}
            onChange={e => setSettings({ ...settings, site_name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="رسوم إدراج القاعة"
              type="number"
              value={settings.hall_listing_fee}
              onChange={e => setSettings({ ...settings, hall_listing_fee: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="رسوم إدراج الخدمة"
              type="number"
              value={settings.service_listing_fee}
              onChange={e => setSettings({ ...settings, service_listing_fee: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <Input
            label="نسبة العمولة"
            type="number"
            step="0.01"
            value={settings.commission_rate}
            onChange={e => setSettings({ ...settings, commission_rate: parseFloat(e.target.value) || 0 })}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.vat_enabled}
              onChange={e => setSettings({ ...settings, vat_enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm font-bold text-gray-700">تفعيل الضريبة (15%)</label>
          </div>
        </div>
      )}

      {/* Booking Tab */}
      {activeTab === 'booking' && (
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-gray-700 mb-4">إعدادات الحجوزات</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="العربون الثابت"
              type="number"
              value={settings.booking_config.deposit_fixed}
              onChange={e => setSettings({ ...settings, booking_config: { ...settings.booking_config, deposit_fixed: parseFloat(e.target.value) || 0 } })}
            />
            <Input
              label="نسبة العربون %"
              type="number"
              value={settings.booking_config.deposit_percent}
              onChange={e => setSettings({ ...settings, booking_config: { ...settings.booking_config, deposit_percent: parseFloat(e.target.value) || 0 } })}
            />
          </div>
          <Input
            label="سعر الحجز المؤقت"
            type="number"
            value={settings.booking_config.hold_price}
            onChange={e => setSettings({ ...settings, booking_config: { ...settings.booking_config, hold_price: parseFloat(e.target.value) || 0 } })}
          />
          <Input
            label="سعر الاستشارة"
            type="number"
            value={settings.booking_config.consultation_price}
            onChange={e => setSettings({ ...settings, booking_config: { ...settings.booking_config, consultation_price: parseFloat(e.target.value) || 0 } })}
          />
        </div>
      )}

      {/* Payment Tab */}
      {activeTab === 'payment' && (
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-gray-700 mb-4">بوابات الدفع</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-sm font-bold text-gray-700">Visa/Mastercard</span>
              <input
                type="checkbox"
                checked={settings.payment_gateways.visa_enabled}
                onChange={e => setSettings({ ...settings, payment_gateways: { ...settings.payment_gateways, visa_enabled: e.target.checked } })}
                className="w-4 h-4"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-sm font-bold text-gray-700">الدفع النقدي</span>
              <input
                type="checkbox"
                checked={settings.payment_gateways.cash_enabled}
                onChange={e => setSettings({ ...settings, payment_gateways: { ...settings.payment_gateways, cash_enabled: e.target.checked } })}
                className="w-4 h-4"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-sm font-bold text-gray-700">HyperPay</span>
              <input
                type="checkbox"
                checked={settings.payment_gateways.hyperpay_enabled}
                onChange={e => setSettings({ ...settings, payment_gateways: { ...settings.payment_gateways, hyperpay_enabled: e.target.checked } })}
                className="w-4 h-4"
              />
            </label>
          </div>
          {settings.payment_gateways.hyperpay_enabled && (
            <div className="space-y-4 pt-4 border-t">
              <Input
                label="Entity ID"
                value={settings.payment_gateways.hyperpay_entity_id}
                onChange={e => setSettings({ ...settings, payment_gateways: { ...settings.payment_gateways, hyperpay_entity_id: e.target.value } })}
              />
              <Input
                label="Access Token"
                value={settings.payment_gateways.hyperpay_access_token}
                onChange={e => setSettings({ ...settings, payment_gateways: { ...settings.payment_gateways, hyperpay_access_token: e.target.value } })}
              />
            </div>
          )}
        </div>
      )}

      {/* Theme Tab */}
      {activeTab === 'theme' && (
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-gray-700 mb-4">إعدادات المظهر</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">اللون الأساسي</label>
              <input
                type="color"
                value={settings.theme_config.primaryColor}
                onChange={e => setSettings({ ...settings, theme_config: { ...settings.theme_config, primaryColor: e.target.value } })}
                className="w-full h-12 rounded-xl border border-gray-200 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">اللون الثانوي</label>
              <input
                type="color"
                value={settings.theme_config.secondaryColor}
                onChange={e => setSettings({ ...settings, theme_config: { ...settings.theme_config, secondaryColor: e.target.value } })}
                className="w-full h-12 rounded-xl border border-gray-200 cursor-pointer"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="خط العناوين"
              value={settings.theme_config.headingFont}
              onChange={e => setSettings({ ...settings, theme_config: { ...settings.theme_config, headingFont: e.target.value } })}
            />
            <Input
              label="خط المحتوى"
              value={settings.theme_config.bodyFont}
              onChange={e => setSettings({ ...settings, theme_config: { ...settings.theme_config, bodyFont: e.target.value } })}
            />
          </div>
        </div>
      )}

      {/* Footer Tab */}
      {activeTab === 'footer' && (
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-gray-700 mb-4">إعدادات التذييل</h3>
          <div className="space-y-4">
            <Input
              label="رقم التواصل"
              value={settings.footer_config.contact_info.phone}
              onChange={e => setSettings({ ...settings, footer_config: { ...settings.footer_config, contact_info: { ...settings.footer_config.contact_info, phone: e.target.value } } })}
            />
            <Input
              label="البريد الإلكتروني"
              value={settings.footer_config.contact_info.email}
              onChange={e => setSettings({ ...settings, footer_config: { ...settings.footer_config, contact_info: { ...settings.footer_config.contact_info, email: e.target.value } } })}
            />
            <Input
              label="العنوان"
              value={settings.footer_config.contact_info.address}
              onChange={e => setSettings({ ...settings, footer_config: { ...settings.footer_config, contact_info: { ...settings.footer_config.contact_info, address: e.target.value } } })}
            />
          </div>
        </div>
      )}

      {/* Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={currentCategory.id ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
        className="max-w-xl"
      >
        <div className="space-y-4">
          <Input
            label="اسم التصنيف"
            value={currentCategory.name || ''}
            onChange={e => setCurrentCategory({ ...currentCategory, name: e.target.value })}
            placeholder="مثال: تصوير، ضيافة، ديكور..."
          />

          <textarea
            value={currentCategory.description || ''}
            onChange={e => setCurrentCategory({ ...currentCategory, description: e.target.value })}
            placeholder="وصف التصنيف"
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-primary focus:outline-none min-h-[80px]"
          />

          <Input
            label="رابط الأيقونة"
            value={currentCategory.icon_url || ''}
            onChange={e => setCurrentCategory({ ...currentCategory, icon_url: e.target.value })}
            placeholder="https://example.com/icon.png"
          />

          {currentCategory.icon_url && (
            <img src={currentCategory.icon_url} alt="معاينة" className="w-16 h-16 rounded-xl object-cover" />
          )}

          <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={currentCategory.is_active}
              onChange={e => setCurrentCategory({ ...currentCategory, is_active: e.target.checked })}
              className="w-4 h-4 text-primary"
            />
            <span className="text-sm font-bold text-gray-700">تصنيف نشط</span>
          </label>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSaveCategory} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="animate-spin" /> : 'حفظ'}
            </Button>
            <Button onClick={() => setIsCategoryModalOpen(false)} variant="outline">
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
