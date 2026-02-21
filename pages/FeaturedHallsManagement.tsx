
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Hall, FeaturedHall } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { useToast } from '../context/ToastContext';
import {
  Star, Plus, Calendar, X, Search, Building2, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface FeaturedHallsManagementProps {
  user: UserProfile;
}

export const FeaturedHallsManagement: React.FC<FeaturedHallsManagementProps> = ({ user }) => {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [featuredHalls, setFeaturedHalls] = useState<FeaturedHall[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHall, setSelectedHall] = useState<Hall | null>(null);
  const [duration, setDuration] = useState('30'); // days
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all active halls
      const { data: hallsData } = await supabase
        .from('halls')
        .select('*, vendor:vendor_id(full_name, business_name)')
        .eq('is_active', true)
        .eq('type', 'hall')
        .order('created_at', { ascending: false });

      // Fetch featured halls
      const { data: featuredData } = await supabase
        .from('featured_halls')
        .select('*, halls(name, city, image_url)')
        .eq('is_active', true)
        .order('end_date', { ascending: true });

      setHalls(hallsData || []);
      setFeaturedHalls(featuredData || []);
    } catch (err) {
      console.error(err);
      toast({ title: 'خطأ', description: 'فشل تحميل البيانات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeatured = async () => {
    if (!selectedHall) {
      toast({ title: 'تنبيه', description: 'يرجى اختيار قاعة', variant: 'destructive' });
      return;
    }

    const days = parseInt(duration);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    try {
      // Create featured hall record
      const { data, error } = await supabase
        .from('featured_halls')
        .insert([{
          hall_id: selectedHall.id,
          vendor_id: selectedHall.vendor_id,
          end_date: endDate.toISOString(),
          created_by: user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ featured_halls insert error:', error);
        throw error;
      }

      console.log('✅ featured_halls record created:', data);

      // Update hall featured status
      const { error: updateError } = await supabase
        .from('halls')
        .update({
          is_featured: true,
          featured_until: endDate.toISOString()
        })
        .eq('id', selectedHall.id);

      if (updateError) {
        console.error('❌ halls update error:', updateError);
        throw updateError;
      }

      console.log('✅ halls table updated:', selectedHall.id);
      console.log('✅ featured_until:', endDate.toISOString());

      // Verify the update
      const { data: verifyData } = await supabase
        .from('halls')
        .select('id, name, is_featured, featured_until')
        .eq('id', selectedHall.id)
        .single();

      console.log('✅ Verification:', verifyData);

      toast({
        title: 'تم التفعيل',
        description: `تم تفعيل القاعة كمميزة لمدة ${days} يوم`,
        variant: 'success'
      });

      setIsModalOpen(false);
      setSelectedHall(null);
      setDuration('30');
      fetchData();
    } catch (err: any) {
      console.error('❌ General error:', err);
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    }
  };

  const handleRemoveFeatured = async (hallId: string, featuredHallId: string) => {
    try {
      // Deactivate featured hall
      await supabase
        .from('featured_halls')
        .update({ is_active: false })
        .eq('id', featuredHallId);

      // Update hall
      await supabase
        .from('halls')
        .update({
          is_featured: false,
          featured_until: null
        })
        .eq('id', hallId);

      toast({ title: 'تم الإزالة', description: 'تم إزالة القاعة من القاعات المميزة', variant: 'success' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    }
  };

  const filteredHalls = halls.filter(hall => 
    hall.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hall.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeFeaturedHallIds = new Set(featuredHalls.map(fh => fh.hall_id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-gray-200">
        <div>
          <h2 className="text-3xl font-black text-primary">إدارة القاعات المميزة</h2>
          <p className="text-sm text-gray-500 font-bold mt-1">تحديد وإدارة القاعات المميزة في الصفحة الرئيسية</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl h-12 px-6 font-bold gap-2"
        >
          <Plus className="w-4 h-4" />
          إضافة قاعة مميزة
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Star className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-500">القاعات المميزة النشطة</span>
          </div>
          <p className="text-2xl font-black text-primary">{featuredHalls.length}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-500">إجمالي القاعات</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{halls.length}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
              <CheckCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-500">قاعات متاحة للتمييز</span>
          </div>
          <p className="text-2xl font-black text-green-600">{halls.length - activeFeaturedHallIds.size}</p>
        </div>
      </div>

      {/* Featured Halls List */}
      <div className="bg-white rounded-[2rem] border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-current" />
            القاعات المميزة حالياً
          </h3>
        </div>

        <div className="p-6">
          {featuredHalls.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 font-bold">لا توجد قاعات مميزة حالياً</p>
            </div>
          ) : (
            <div className="space-y-3">
              {featuredHalls.map((fh) => (
                <div key={fh.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-4 flex-1">
                    <img
                      src={fh.halls?.image_url || 'https://via.placeholder.com/80'}
                      alt={fh.halls?.name || 'Hall'}
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-black text-gray-900">{fh.halls?.name || 'قاعة'}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gray-500 font-bold flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {fh.halls?.city}
                        </span>
                        <span className="text-xs text-gray-500 font-bold flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          ينتهي: {format(new Date(fh.end_date), 'yyyy/MM/dd')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-left">
                      <div className="flex items-center gap-1 text-green-600">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs font-bold">
                          {Math.ceil((new Date(fh.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} يوم متبقي
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRemoveFeatured(fh.hall_id, fh.id)}
                      variant="destructive"
                      className="h-10 px-4 rounded-xl text-xs font-bold"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Featured Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900">إضافة قاعة مميزة</h3>
              <button
                onClick={() => { setIsModalOpen(false); setSelectedHall(null); setDuration('30'); }}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Search */}
              <div className="relative">
                <Input
                  placeholder="ابحث عن قاعة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 rounded-xl pr-12"
                  icon={<Search className="w-5 h-5 text-gray-400" />}
                />
              </div>

              {/* Halls List */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredHalls.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 font-bold">لا توجد قاعات</p>
                ) : (
                  filteredHalls.map((hall) => (
                    <div
                      key={hall.id}
                      onClick={() => !activeFeaturedHallIds.has(hall.id) && setSelectedHall(hall)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedHall?.id === hall.id
                          ? 'border-primary bg-primary/5'
                          : activeFeaturedHallIds.has(hall.id)
                          ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-100 hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={hall.image_url}
                          alt={hall.name}
                          className="w-16 h-16 rounded-xl object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-black text-gray-900">{hall.name}</p>
                          <p className="text-xs text-gray-500 font-bold">{hall.city}</p>
                        </div>
                        {activeFeaturedHallIds.has(hall.id) ? (
                          <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            مميزة
                          </span>
                        ) : selectedHall?.id === hall.id ? (
                          <CheckCircle className="w-6 h-6 text-primary" />
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Duration */}
              {selectedHall && (
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <label className="text-sm font-bold text-gray-500">مدة التمييز</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[7, 14, 30, 60, 90, 180].map((days) => (
                      <button
                        key={days}
                        onClick={() => setDuration(days.toString())}
                        className={`h-12 rounded-xl font-bold text-sm transition-all ${
                          duration === days.toString()
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {days} يوم
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                    <p className="text-xs text-blue-700 font-bold">
                      سيتم عرض هذه القاعة في قسم "قاعات مميزة" بالصفحة الرئيسية لمدة {duration} يوم
                    </p>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={handleAddFeatured}
                  disabled={!selectedHall}
                  className="flex-1 h-14 rounded-2xl font-black"
                >
                  <Star className="w-5 h-5 ml-2" />
                  تفعيل القاعة كمميزة
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
