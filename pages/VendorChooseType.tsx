
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, SAUDI_CITIES, HallPackage, HallAddon, SeasonalPrice } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { useToast } from '../context/ToastContext';
import {
  Building2, Sparkles, Plus, X, Loader2, Trash2, CheckSquare,
  CreditCard, ArrowRight, Upload, ImageIcon
} from 'lucide-react';

interface VendorChooseTypeProps {
  user: UserProfile;
  onBack?: () => void;
}

export const VendorChooseType: React.FC<VendorChooseTypeProps> = ({ user, onBack }) => {
  const [selectedType, setSelectedType] = useState<'hall' | 'service' | null>(null);
  const [step, setStep] = useState<'choose' | 'form'>('choose');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [systemLogo, setSystemLogo] = useState('https://dash.hall.sa/logo.svg');
  const { toast } = useToast();

  // Hall Form State
  const [hallData, setHallData] = useState({
    name: '',
    name_en: '',
    city: SAUDI_CITIES[0],
    capacity_men: '',
    capacity_women: '',
    description: '',
    description_en: '',
    price_per_night: '',
    images: [] as string[],
    amenities: [] as string[],
    packages: [] as HallPackage[],
    addons: [] as HallAddon[],
    seasonal_prices: [] as SeasonalPrice[]
  });

  // Service Form State
  const [serviceData, setServiceData] = useState({
    name: '',
    category: 'ضيافة',
    price: '',
    description: ''
  });

  const [newPackage, setNewPackage] = useState<HallPackage>({
    name: '', price: 0, min_men: 0, max_men: 100, min_women: 0, max_women: 100, is_default: false
  });

  const [newAddon, setNewAddon] = useState<HallAddon>({ name: '', price: 0, description: '' });

  const [newAmenity, setNewAmenity] = useState('');

  useEffect(() => {
    checkExistingAssets();
    fetchLogo();
  }, [user.id]);

  const checkExistingAssets = async () => {
    const [halls, services] = await Promise.all([
      supabase.from('halls').select('id', { count: 'exact', head: true }).eq('vendor_id', user.id),
      supabase.from('services').select('id', { count: 'exact', head: true }).eq('vendor_id', user.id)
    ]);

    const hasHalls = (halls.count || 0) > 0;
    const hasServices = (services.count || 0) > 0;

    // If already has assets, redirect to dashboard
    if (hasHalls || hasServices) {
      window.location.href = '/#/dashboard';
    }
  };

  const fetchLogo = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
    if (data?.value?.platform_logo_url) {
      setSystemLogo(data.value.platform_logo_url);
    }
  };

  const handleSelectType = (type: 'hall' | 'service') => {
    setSelectedType(type);
    setStep('form');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    try {
      const file = files[0];
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('hall-images').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('hall-images').getPublicUrl(fileName);
      const newImages = [...hallData.images, publicUrl];
      setHallData(prev => ({ ...prev, images: newImages }));
      
      toast({ title: 'تم الرفع', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const addPackage = () => {
    if (!newPackage.name || newPackage.price <= 0) {
      toast({ title: 'تنبيه', description: 'يرجى إدخال اسم الباقة وسعر الفرد', variant: 'destructive' });
      return;
    }
    
    const updatedPackages = [...hallData.packages];
    if (newPackage.is_default) {
      updatedPackages.forEach(p => p.is_default = false);
    }
    updatedPackages.push(newPackage);
    
    setHallData(prev => ({ ...prev, packages: updatedPackages }));
    setNewPackage({ name: '', price: 0, min_men: 0, max_men: 100, min_women: 0, max_women: 100, is_default: false });
  };

  const addAddon = () => {
    if (!newAddon.name || newAddon.price < 0) return;
    setHallData(prev => ({ ...prev, addons: [...prev.addons, newAddon] }));
    setNewAddon({ name: '', price: 0, description: '' });
  };

  const handleAddAmenity = () => {
    if (!newAmenity.trim()) return;
    if (hallData.amenities.includes(newAmenity.trim())) {
      toast({ title: 'تنبيه', description: 'هذه الميزة مضافة بالفعل', variant: 'warning' });
      return;
    }
    setHallData(prev => ({ ...prev, amenities: [...prev.amenities, newAmenity.trim()] }));
    setNewAmenity('');
  };

  const removeAmenity = (index: number) => {
    setHallData(prev => ({ ...prev, amenities: prev.amenities.filter((_, i) => i !== index) }));
  };

  const handleHallSubmit = async () => {
    if (!hallData.name || !hallData.city || !hallData.price_per_night) {
      toast({ title: 'تنبيه', description: 'يرجى إكمال البيانات الأساسية', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        vendor_id: user.id,
        name: hallData.name,
        name_en: hallData.name_en,
        city: hallData.city,
        type: 'hall' as const,
        capacity: (Number(hallData.capacity_men) || 0) + (Number(hallData.capacity_women) || 0),
        capacity_men: Number(hallData.capacity_men) || 0,
        capacity_women: Number(hallData.capacity_women) || 0,
        price_per_night: Number(hallData.price_per_night),
        description: hallData.description,
        description_en: hallData.description_en,
        image_url: hallData.images[0] || '',
        images: hallData.images,
        amenities: hallData.amenities,
        packages: hallData.packages,
        addons: hallData.addons,
        seasonal_prices: hallData.seasonal_prices,
        is_active: true
      };

      const { error } = await supabase.from('halls').insert([payload]);
      if (error) throw error;

      toast({ title: 'تم الإضافة', description: 'تم إضافة القاعة بنجاح', variant: 'success' });
      
      // Redirect to dashboard
      window.location.href = '/#/dashboard';
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSubmit = async () => {
    if (!serviceData.name || !serviceData.price) {
      toast({ title: 'تنبيه', description: 'يرجى إكمال البيانات', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        vendor_id: user.id,
        name: serviceData.name,
        category: serviceData.category,
        price: Number(serviceData.price),
        description: serviceData.description,
        image_url: '',
        images: [],
        is_active: true
      };

      const { error } = await supabase.from('services').insert([payload]);
      if (error) throw error;

      toast({ title: 'تم الإضافة', description: 'تم إضافة الخدمة بنجاح', variant: 'success' });
      
      // Redirect to dashboard
      window.location.href = '/#/dashboard';
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Choose Type Step
  if (step === 'choose') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-tajawal" dir="rtl">
        <div className="w-full max-w-4xl">
          {/* Header with Logo */}
          <div className="text-center mb-12">
            <img 
              src={systemLogo} 
              alt="Platform Logo" 
              className="h-40 w-auto mx-auto mb-8 object-contain"
            />
            <h1 className="text-4xl font-black text-primary mb-2">مرحبا ألف {user.full_name || 'شريك'} 👋</h1>
            <p className="text-xl text-gray-500 font-bold">ما هو نوع النشاط الذي تريد إضافته؟</p>
          </div>

          {/* Options */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Hall Option */}
            <button
              onClick={() => handleSelectType('hall')}
              className="group p-10 bg-white border-2 border-gray-100 rounded-[3rem] hover:border-primary/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center gap-6"
            >
              <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 group-hover:bg-primary group-hover:text-white transition-colors">
                <Building2 className="w-10 h-10" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-black text-gray-900 mb-2">القاعات</h3>
                <p className="text-sm font-bold text-gray-400">للمناسبات الكبيرة والزواجات</p>
              </div>
            </button>

            {/* Service Option */}
            <button
              onClick={() => handleSelectType('service')}
              className="group p-10 bg-white border-2 border-gray-100 rounded-[3rem] hover:border-orange-500/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center gap-6"
            >
              <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                <Sparkles className="w-10 h-10" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-black text-gray-900 mb-2">الخدمات الإضافية</h3>
                <p className="text-sm font-bold text-gray-400">ضيافة، تصوير، كوش، وغيرها</p>
              </div>
            </button>
          </div>

          {/* Info */}
          <div className="mt-12 text-center">
            <p className="text-sm font-bold text-gray-500">
              اختر نوع النشاط للمتابعة
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Form Step
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 font-tajawal" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <img 
              src={systemLogo} 
              alt="Platform Logo" 
              className="h-20 w-auto object-contain"
            />
            <div>
              <h1 className="text-3xl font-black text-primary">
                إضافة {selectedType === 'hall' ? 'قاعة' : 'خدمة'} جديدة
              </h1>
              <p className="text-gray-500 font-bold mt-1">أكمل البيانات لإدراج نشاطك في المنصة</p>
            </div>
          </div>
          <button
            onClick={() => setStep('choose')}
            className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
            <span className="font-bold text-sm">عودة</span>
          </button>
        </div>

        {/* Hall Form */}
        {selectedType === 'hall' && (
          <div className="space-y-8">
            {/* Basic Info */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-black text-primary mb-4">البيانات الأساسية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="اسم القاعة (عربي)" value={hallData.name} onChange={e => setHallData({...hallData, name: e.target.value})} className="h-12 rounded-xl" />
                <Input label="اسم القاعة (إنجليزي)" value={hallData.name_en} onChange={e => setHallData({...hallData, name_en: e.target.value})} className="h-12 rounded-xl text-left" dir="ltr" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="سعة الرجال" type="number" value={hallData.capacity_men} onChange={e => setHallData({...hallData, capacity_men: e.target.value})} className="h-12 rounded-xl" />
                <Input label="سعة النساء" type="number" value={hallData.capacity_women} onChange={e => setHallData({...hallData, capacity_women: e.target.value})} className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">المدينة</label>
                <select
                  className="w-full h-12 border border-gray-200 rounded-xl px-4 bg-white outline-none font-bold text-sm"
                  value={hallData.city}
                  onChange={e => setHallData({...hallData, city: e.target.value})}
                >
                  {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">سعر الليلة (ريال سعودي)</label>
                <Input
                  type="number"
                  value={hallData.price_per_night}
                  onChange={e => setHallData({...hallData, price_per_night: e.target.value})}
                  className="h-12 rounded-xl"
                  placeholder="أدخل سعر الليلة"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">الوصف (عربي)</label>
                  <textarea
                    className="w-full h-32 border border-gray-200 rounded-xl p-3 bg-white outline-none resize-none font-bold text-sm"
                    value={hallData.description}
                    onChange={e => setHallData({...hallData, description: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">الوصف (إنجليزي)</label>
                  <textarea
                    className="w-full h-32 border border-gray-200 rounded-xl p-3 bg-white outline-none resize-none font-bold text-sm text-left"
                    dir="ltr"
                    value={hallData.description_en}
                    onChange={e => setHallData({...hallData, description_en: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-black text-primary mb-4">صور القاعة</h3>
              <div className="flex flex-wrap gap-4">
                <div
                  onClick={() => document.getElementById('hall-image-upload')?.click()}
                  className="w-32 h-32 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all text-gray-400 hover:text-primary"
                >
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-8 h-8 mb-2" />}
                  <span className="text-[10px] font-bold">رفع صورة</span>
                </div>
                <input type="file" hidden id="hall-image-upload" accept="image/*" onChange={handleFileUpload} />
                {hallData.images.map((img, i) => (
                  <div key={i} className="w-32 h-32 rounded-2xl overflow-hidden relative group border border-gray-200">
                    <img src={img} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setHallData(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-black text-primary mb-4">المرافق والمميزات</h3>
              <div className="flex gap-2 mb-4">
                <Button onClick={handleAddAmenity} className="h-11 w-11 rounded-xl bg-primary text-white p-0 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </Button>
                <Input
                  placeholder="اكتب الميزة هنا..."
                  value={newAmenity}
                  onChange={e => setNewAmenity(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAmenity()}
                  className="h-11 flex-1 bg-gray-50"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {hallData.amenities.map((amenity, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 transition-all hover:border-primary/50 group">
                    <CheckSquare className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-gray-700">{amenity}</span>
                    <button onClick={() => removeAmenity(idx)} className="text-gray-400 hover:text-red-500 transition-colors mr-2">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Packages */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-black text-primary mb-4">باقات الحجز</h3>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="اسم الباقة" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} className="h-11 bg-white" />
                  <Input placeholder="سعر الفرد" type="number" value={newPackage.price || ''} onChange={e => setNewPackage({...newPackage, price: Number(e.target.value)})} className="h-11 bg-white" />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Input label="أقل رجال" type="number" value={newPackage.min_men} onChange={e => setNewPackage({...newPackage, min_men: Number(e.target.value)})} className="h-10 bg-white" />
                  <Input label="أكثر رجال" type="number" value={newPackage.max_men} onChange={e => setNewPackage({...newPackage, max_men: Number(e.target.value)})} className="h-10 bg-white" />
                  <Input label="أقل نساء" type="number" value={newPackage.min_women} onChange={e => setNewPackage({...newPackage, min_women: Number(e.target.value)})} className="h-10 bg-white" />
                  <Input label="أكثر نساء" type="number" value={newPackage.max_women} onChange={e => setNewPackage({...newPackage, max_women: Number(e.target.value)})} className="h-10 bg-white" />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newPackage.is_default}
                    onChange={e => setNewPackage({...newPackage, is_default: e.target.checked})}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-xs font-bold">باقة افتراضية</span>
                </div>
                <Button onClick={addPackage} className="w-full h-11 rounded-xl font-bold bg-gray-900 text-white gap-2">
                  <Plus className="w-4 h-4" /> إضافة
                </Button>
              </div>
              <div className="space-y-2">
                {hallData.packages.map((pkg, idx) => (
                  <div key={idx} className="p-4 border rounded-2xl relative bg-white border-gray-200">
                    <button
                      onClick={() => setHallData(prev => ({...prev, packages: prev.packages.filter((_, i) => i !== idx)}))}
                      className="absolute top-4 left-4 text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <h4 className="font-bold text-gray-900">{pkg.name}</h4>
                    <PriceTag amount={pkg.price} className="text-primary" />
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleHallSubmit}
              disabled={loading}
              className="w-full h-16 rounded-2xl font-black text-lg bg-gray-900 text-white shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>
                  <CreditCard className="w-6 h-6" />
                  <span>إضافة القاعة ومتابعة</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Service Form */}
        {selectedType === 'service' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
            <h3 className="text-lg font-black text-primary mb-4">بيانات الخدمة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="الاسم التجاري" value={serviceData.name} onChange={e => setServiceData({...serviceData, name: e.target.value})} className="h-12 rounded-xl" />
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">التصنيف</label>
                <select
                  className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-primary"
                  value={serviceData.category}
                  onChange={e => setServiceData({...serviceData, category: e.target.value})}
                >
                  {['ضيافة', 'تصوير', 'كوش', 'بوفيه', 'إضاءة وصوت', 'زينة وزهور', 'تنسيق حفلات', 'أخرى'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="السعر يبدأ من" type="number" value={serviceData.price} onChange={e => setServiceData({...serviceData, price: e.target.value})} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">وصف الخدمة</label>
              <textarea
                className="w-full h-32 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none resize-none focus:border-primary"
                value={serviceData.description}
                onChange={e => setServiceData({...serviceData, description: e.target.value})}
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleServiceSubmit}
              disabled={loading}
              className="w-full h-16 rounded-2xl font-black text-lg bg-gray-900 text-white shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>
                  <CreditCard className="w-6 h-6" />
                  <span>إضافة الخدمة ومتابعة</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
