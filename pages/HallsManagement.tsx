import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { PriceTag } from '../components/ui/PriceTag';
import {
  Building2, Search, MapPin, Users, Edit3, Star, StarOff,
  Trash2, Loader2, CheckCircle2, XCircle, Image as ImageIcon, Video, FileText
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Hall } from '../types';

interface HallWithVendor extends Hall {
  profiles?: {
    full_name: string;
    email: string;
  };
}

export const HallsManagement: React.FC = () => {
  const [halls, setHalls] = useState<HallWithVendor[]>([]);
  const [filteredHalls, setFilteredHalls] = useState<HallWithVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('الكل');
  const [capacityFilter, setCapacityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal state
  const [selectedHall, setSelectedHall] = useState<HallWithVendor | null>(null);
  const [isHallModalOpen, setIsHallModalOpen] = useState(false);
  const [hallData, setHallData] = useState<Partial<Hall>>({});

  const cities = ['الكل', 'الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'الطائف', 'أبها'];

  useEffect(() => {
    fetchHalls();
  }, []);

  useEffect(() => {
    filterHalls();
  }, [searchQuery, selectedCity, capacityFilter, statusFilter, halls]);

  const fetchHalls = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('halls')
      .select(`
        *,
        profiles (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      setHalls(data || []);
    }
    setLoading(false);
  };

  const filterHalls = () => {
    let filtered = [...halls];

    // Search by name
    if (searchQuery) {
      filtered = filtered.filter(hall =>
        hall.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by city
    if (selectedCity !== 'الكل') {
      filtered = filtered.filter(hall => hall.city === selectedCity);
    }

    // Filter by capacity
    if (capacityFilter !== 'all') {
      const [min, max] = capacityFilter.split('-').map(Number);
      if (max) {
        filtered = filtered.filter(hall => hall.capacity >= min && hall.capacity <= max);
      } else {
        filtered = filtered.filter(hall => hall.capacity >= min);
      }
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(hall => hall.is_active.toString() === statusFilter);
    }

    setFilteredHalls(filtered);
  };

  const handleOpenHallDetails = async (hall: HallWithVendor) => {
    setSelectedHall(hall);
    setHallData(hall);
    setIsHallModalOpen(true);
  };

  const handleSaveHall = async () => {
    if (!hallData.name || !hallData.city) {
      toast({ title: 'خطأ', description: 'الاسم والمدينة مطلوبان', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        name: hallData.name,
        city: hallData.city,
        updated_at: new Date().toISOString()
      };

      // Only include optional fields if they have values
      if (hallData.capacity !== undefined && hallData.capacity !== null) {
        updateData.capacity = hallData.capacity;
      }
      if (hallData.price_per_night !== undefined && hallData.price_per_night !== null) {
        updateData.price_per_night = hallData.price_per_night;
      }
      if (hallData.description !== undefined) {
        updateData.description = hallData.description;
      }
      if (hallData.is_active !== undefined) {
        updateData.is_active = hallData.is_active;
      }

      console.log('Updating hall:', hallData.id, 'with data:', updateData);

      const { error } = await supabase
        .from('halls')
        .update(updateData)
        .eq('id', hallData.id);

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || 'فشل تحديث القاعة');
      }

      toast({ title: 'تم التحديث', description: 'تم تحديث بيانات القاعة بنجاح', variant: 'success' });
      fetchHalls();
      setIsHallModalOpen(false);
    } catch (err: any) {
      console.error('Error saving hall:', err);
      toast({ title: 'خطأ', description: err.message || 'فشل حفظ التغييرات', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeatured = async (hallId: string, isFeatured: boolean) => {
    setSaving(true);
    try {
      if (isFeatured) {
        // Add to featured_halls
        const { error } = await supabase
          .from('featured_halls')
          .insert([{ hall_id: hallId }]);
        if (error && error.code !== '23505') throw error; // Ignore duplicate
      } else {
        // Remove from featured_halls
        const { error } = await supabase
          .from('featured_halls')
          .delete()
          .eq('hall_id', hallId);
        if (error) throw error;
      }

      toast({
        title: 'تم التحديث',
        description: isFeatured ? 'تمت إضافة القاعة للمميزة' : 'تمت إزالة القاعة من المميزة',
        variant: 'success'
      });
      fetchHalls();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (hallId: string, isActive: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('halls')
        .update({ is_active: !isActive, updated_at: new Date().toISOString() })
        .eq('id', hallId);

      if (error) throw error;

      toast({
        title: 'تم التحديث',
        description: isActive ? 'تم تعطيل القاعة (مخفية عن الجميع)' : 'تم تفعيل القاعة (ظاهرة للجميع)',
        variant: 'success'
      });
      fetchHalls();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isHallFeatured = (hallId: string) => {
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-ruqaa text-primary">إدارة القاعات</h2>
              <p className="text-gray-500 font-bold text-sm">تحكم كامل في جميع القاعات</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-3xl font-black text-primary">{filteredHalls.length}</p>
            <p className="text-xs font-bold text-gray-500">قاعة</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="البحث باسم القاعة..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <select
            value={selectedCity}
            onChange={e => setSelectedCity(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 focus:border-primary focus:outline-none"
          >
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          <select
            value={capacityFilter}
            onChange={e => setCapacityFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 focus:border-primary focus:outline-none"
          >
            <option value="all">جميع السعات</option>
            <option value="0-100">0-100 شخص</option>
            <option value="101-300">101-300 شخص</option>
            <option value="301-500">301-500 شخص</option>
            <option value="501">500+ شخص</option>
          </select>
        </div>
      </div>

      {/* Halls Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase">القاعة</th>
                <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase">المدينة</th>
                <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase">السعة</th>
                <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase">السعر</th>
                <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase">المالك</th>
                <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase">الحالة</th>
                <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : filteredHalls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center text-gray-500 font-bold">
                    لا توجد قاعات مطابقة
                  </td>
                </tr>
              ) : (
                filteredHalls.map((hall) => (
                  <tr
                    key={hall.id}
                    onClick={() => handleOpenHallDetails(hall)}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {hall.image_url && (
                          <img
                            src={hall.image_url}
                            alt={hall.name}
                            className="w-12 h-12 rounded-xl object-cover"
                          />
                        )}
                        <div>
                          <p className="font-bold text-sm text-gray-900">{hall.name}</p>
                          <p className="text-xs text-gray-500">{hall.city}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-bold text-gray-700">{hall.city}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm font-bold text-gray-700">
                        <Users className="w-4 h-4" />
                        {hall.capacity}
                      </div>
                    </td>
                    <td className="p-4">
                      <PriceTag amount={Number(hall.price_per_night)} className="text-sm font-bold" />
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm font-bold text-gray-700">
                          {hall.profiles?.full_name || 'غير معروف'}
                        </p>
                        <p className="text-xs text-gray-500">{hall.profiles?.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={hall.is_active ? 'success' : 'default'}>
                        {hall.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenHallDetails(hall);
                          }}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Edit3 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFeatured(hall.id, isHallFeatured(hall.id));
                          }}
                          className="p-2 hover:bg-yellow-50 rounded-lg transition-colors"
                          title={isHallFeatured(hall.id) ? 'إزالة من المميزة' : 'إضافة للمميزة'}
                        >
                          {isHallFeatured(hall.id) ? (
                            <StarOff className="w-4 h-4 text-yellow-600" />
                          ) : (
                            <Star className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(hall.id, hall.is_active);
                          }}
                          className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                          title={hall.is_active ? 'إخفاء القاعة' : 'إظهار القاعة'}
                        >
                          {hall.is_active ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hall Details Modal */}
      <Modal
        isOpen={isHallModalOpen}
        onClose={() => setIsHallModalOpen(false)}
        title="تفاصيل القاعة"
        className="max-w-4xl"
      >
        {selectedHall && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <img
                  src={selectedHall.image_url || 'https://via.placeholder.com/400x300'}
                  alt={selectedHall.name}
                  className="w-full h-48 object-cover rounded-2xl"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">اسم القاعة</label>
                  <Input
                    value={hallData.name || ''}
                    onChange={e => setHallData({ ...hallData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">المدينة</label>
                    <select
                      value={hallData.city || ''}
                      onChange={e => setHallData({ ...hallData, city: e.target.value })}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:border-primary"
                    >
                      {cities.filter(c => c !== 'الكل').map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">السعة</label>
                    <Input
                      type="number"
                      value={hallData.capacity || ''}
                      onChange={e => setHallData({ ...hallData, capacity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">السعر</label>
                  <Input
                    type="number"
                    value={hallData.price_per_night || ''}
                    onChange={e => setHallData({ ...hallData, price_per_night: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">الوصف</label>
              <textarea
                value={hallData.description || ''}
                onChange={e => setHallData({ ...hallData, description: e.target.value })}
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-primary min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={hallData.is_active || false}
                  onChange={e => setHallData({ ...hallData, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm font-bold text-gray-700">قاعة نشطة</span>
              </label>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleSaveHall} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="animate-spin" /> : 'حفظ التغييرات'}
              </Button>
              <Button onClick={() => setIsHallModalOpen(false)} variant="outline">
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
