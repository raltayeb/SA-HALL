
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { UserCog, Lock, Loader2, List, Plus, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface VendorBrandSettingsProps {
  user: UserProfile;
  onUpdate: (userId: string) => void;
}

export const VendorBrandSettings: React.FC<VendorBrandSettingsProps> = ({ user, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'amenities'>('profile');
  const [loading, setLoading] = useState(false);
  
  // Profile State
  const [profileData, setProfileData] = useState({
      full_name: user.full_name || '',
      newPassword: '',
      confirmNewPassword: ''
  });

  // Amenities State
  const [customAmenities, setCustomAmenities] = useState<string[]>(user.vendor_amenities || []);
  const [newAmenity, setNewAmenity] = useState('');

  const { toast } = useToast();

  const addAmenity = () => {
      if (newAmenity.trim() && !customAmenities.includes(newAmenity.trim())) {
          setCustomAmenities([...customAmenities, newAmenity.trim()]);
          setNewAmenity('');
      }
  };

  const removeAmenity = (am: string) => {
      setCustomAmenities(customAmenities.filter(a => a !== am));
  };

  const handleSaveProfile = async () => {
      setLoading(true);
      try {
          const { error: profileError } = await supabase.from('profiles').update({
              full_name: profileData.full_name,
          }).eq('id', user.id);
          
          if (profileError) throw profileError;

          if (profileData.newPassword) {
              if (profileData.newPassword !== profileData.confirmNewPassword) {
                  throw new Error('كلمات المرور غير متطابقة');
              }
              const { error: authError } = await supabase.auth.updateUser({ password: profileData.newPassword });
              if (authError) throw authError;
              toast({ title: 'أمان الحساب', description: 'تم تحديث كلمة المرور.', variant: 'success' });
              setProfileData(prev => ({ ...prev, newPassword: '', confirmNewPassword: '' }));
          }

          toast({ title: 'تم الحفظ', description: 'تم تحديث المعلومات الشخصية.', variant: 'success' });
          onUpdate(user.id);
      } catch (err: any) {
          toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
      } finally {
          setLoading(false);
      }
  };

  const handleSaveAmenities = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ vendor_amenities: customAmenities }).eq('id', user.id);
      if (error) throw error;
      toast({ title: 'نجاح', description: 'تم حفظ قائمة المميزات.', variant: 'success' });
      onUpdate(user.id);
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10 font-tajawal text-right">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-2 text-gray-900">
            <UserCog className="w-8 h-8 text-primary" /> إعدادات المنشأة
          </h2>
          <p className="text-gray-500 font-bold mt-1 text-sm">إدارة الملف الشخصي والمميزات.</p>
        </div>
        
        <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-200 overflow-x-auto no-scrollbar w-full md:w-auto">
           <button onClick={() => setActiveTab('profile')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'profile' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
             <UserCog className="w-4 h-4" /> الملف الشخصي
           </button>
           <button onClick={() => setActiveTab('amenities')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'amenities' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
             <List className="w-4 h-4" /> المميزات الخاصة
           </button>
        </div>
      </div>

      {activeTab === 'profile' && (
          <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                  <h3 className="text-xl font-black flex items-center gap-2 border-b border-gray-50 pb-4">
                      <UserCog className="w-5 h-5 text-primary" /> المعلومات الشخصية
                  </h3>
                  <div className="space-y-4">
                      <Input label="الاسم الكامل" value={profileData.full_name} onChange={e => setProfileData({...profileData, full_name: e.target.value})} className="h-12 rounded-xl font-bold" />
                      <Input label="البريد الإلكتروني" value={user.email} disabled className="h-12 rounded-xl font-bold bg-gray-50 text-gray-500 cursor-not-allowed" />
                  </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                  <h3 className="text-xl font-black flex items-center gap-2 border-b border-gray-50 pb-4 text-red-500">
                      <Lock className="w-5 h-5" /> الأمان وكلمة المرور
                  </h3>
                  <div className="space-y-4">
                      <Input type="password" label="كلمة المرور الجديدة" placeholder="••••••••" value={profileData.newPassword} onChange={e => setProfileData({...profileData, newPassword: e.target.value})} className="h-12 rounded-xl font-bold" />
                      <Input type="password" label="تأكيد كلمة المرور" placeholder="••••••••" value={profileData.confirmNewPassword} onChange={e => setProfileData({...profileData, confirmNewPassword: e.target.value})} className="h-12 rounded-xl font-bold" />
                  </div>
                  <div className="pt-4">
                      <Button onClick={handleSaveProfile} disabled={loading} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 bg-gray-900 text-white hover:bg-black">
                          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'حفظ التغييرات'}
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'amenities' && (
          <div className="grid gap-8 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
                  <h3 className="text-xl font-black flex items-center justify-end gap-2 border-b pb-4">
                      قائمة المميزات الخاصة <List className="w-5 h-5 text-primary" />
                  </h3>
                  <div className="space-y-4">
                      <div className="flex gap-2">
                          <Button onClick={addAmenity} className="rounded-xl h-12 w-12 p-0 flex items-center justify-center bg-primary text-white"><Plus className="w-6 h-6" /></Button>
                          <Input 
                              placeholder="اسم الميزة (مثال: نطيطة هوائية)" 
                              value={newAmenity} 
                              onChange={e => setNewAmenity(e.target.value)} 
                              onKeyDown={e => e.key === 'Enter' && addAmenity()}
                              className="h-12 rounded-xl text-right font-bold"
                          />
                      </div>
                      <div className="flex flex-wrap gap-3 mt-4">
                          {customAmenities.map((am, i) => (
                              <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 flex items-center gap-2 font-bold text-gray-700 group">
                                  <button onClick={() => removeAmenity(am)} className="text-gray-300 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                                  <span>{am}</span>
                              </div>
                          ))}
                          {customAmenities.length === 0 && <span className="text-gray-400 text-sm font-bold">لا توجد مميزات مضافة.</span>}
                      </div>
                  </div>
              </div>
              <div className="flex flex-col justify-end space-y-4">
                  <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2.5rem] text-center">
                      <p className="text-blue-800 font-bold text-sm leading-relaxed">ستظهر هذه القائمة عند إضافة أو تعديل أي أصل.</p>
                  </div>
                  <Button onClick={handleSaveAmenities} disabled={loading} className="w-full h-16 rounded-[2rem] font-black text-lg shadow-xl shadow-primary/20">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'حفظ المميزات'}
                  </Button>
              </div>
          </div>
      )}
    </div>
  );
};
