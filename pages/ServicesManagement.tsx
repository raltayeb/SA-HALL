import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { PriceTag } from '../components/ui/PriceTag';
import {
  Building2, Search, Edit3, Star, StarOff, CheckCircle2, XCircle, Loader2, Plus, Tag as TagIcon, Trash2
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface Service {
  id: string;
  vendor_id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  image_url?: string;
  is_active: boolean;
  is_featured?: boolean;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export const ServicesManagement: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal state
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceData, setServiceData] = useState<Partial<Service>>({});

  const categories = ['الكل', 'ضيافة', 'تصوير', 'ديكور', 'مكياج', 'موسيقى', 'نقل', 'أخرى'];

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    filterServices();
  }, [searchQuery, selectedCategory, statusFilter, services]);

  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('services')
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
      setServices(data || []);
    }
    setLoading(false);
  };

  const filterServices = () => {
    let filtered = [...services];

    if (searchQuery) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'الكل') {
      filtered = filtered.filter(service => service.category === selectedCategory);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(service => service.is_active.toString() === statusFilter);
    }

    setFilteredServices(filtered);
  };

  const handleOpenServiceDetails = async (service: Service) => {
    setSelectedService(service);
    setServiceData(service);
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async () => {
    if (!serviceData.name || !serviceData.category) {
      toast({ title: 'خطأ', description: 'الاسم والتصنيف مطلوبان', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        name: serviceData.name,
        category: serviceData.category,
        updated_at: new Date().toISOString()
      };

      if (serviceData.price !== undefined) {
        updateData.price = Number(serviceData.price);
      }
      if (serviceData.description !== undefined) {
        updateData.description = serviceData.description;
      }
      if (serviceData.is_active !== undefined) {
        updateData.is_active = serviceData.is_active;
      }

      const { error } = await supabase
        .from('services')
        .update(updateData)
        .eq('id', serviceData.id);

      if (error) throw error;

      toast({ title: 'تم التحديث', description: 'تم تحديث بيانات الخدمة بنجاح', variant: 'success' });
      fetchServices();
      setIsServiceModalOpen(false);
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeatured = async (serviceId: string, isCurrentlyFeatured: boolean) => {
    setSaving(true);
    try {
      if (isCurrentlyFeatured) {
        const { error } = await supabase
          .from('featured_services')
          .delete()
          .eq('service_id', serviceId);
        if (error) throw error;
        
        // Update local state
        const newFeatured = new Set(featuredServices);
        newFeatured.delete(serviceId);
        setFeaturedServices(newFeatured);
      } else {
        const { error } = await supabase
          .from('featured_services')
          .insert([{ service_id: serviceId }]);
        if (error && error.code !== '23505') throw error;
        
        // Update local state
        const newFeatured = new Set(featuredServices);
        newFeatured.add(serviceId);
        setFeaturedServices(newFeatured);
      }

      toast({
        title: 'تم التحديث',
        description: isCurrentlyFeatured ? 'تمت إزالة الخدمة من المميزة' : 'تمت إضافة الخدمة للمميزة',
        variant: 'success'
      });
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (serviceId: string, isActive: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !isActive })
        .eq('id', serviceId);

      if (error) throw error;

      toast({
        title: 'تم التحديث',
        description: isActive ? 'تم تعطيل الخدمة' : 'تم تفعيل الخدمة',
        variant: 'success'
      });
      fetchServices();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    
    setSaving(true);
    try {
      // First remove from featured if exists
      await supabase.from('featured_services').delete().eq('service_id', serviceId);
      
      // Then delete the service
      const { error } = await supabase.from('services').delete().eq('id', serviceId);
      if (error) throw error;

      toast({ title: 'تم الحذف', description: 'تم حذف الخدمة بنجاح', variant: 'success' });
      fetchServices();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isServiceFeatured = async (serviceId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('featured_services')
      .select('service_id')
      .eq('service_id', serviceId)
      .maybeSingle();
    return !!data;
  };

  const [featuredServices, setFeaturedServices] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchFeatured = async () => {
      const { data } = await supabase.from('featured_services').select('service_id');
      if (data) {
        setFeaturedServices(new Set(data.map(f => f.service_id)));
      }
    };
    fetchFeatured();
  }, []);

  const isFeatured = (serviceId: string) => featuredServices.has(serviceId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إدارة الخدمات</h2>
          <p className="text-sm text-gray-500 mt-1">تحكم كامل في جميع الخدمات</p>
        </div>
        <div className="text-left">
          <p className="text-3xl font-bold text-primary">{filteredServices.length}</p>
          <p className="text-xs text-gray-500">خدمة</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="البحث باسم الخدمة..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none"
          >
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none"
          >
            <option value="all">جميع الحالات</option>
            <option value="true">نشط</option>
            <option value="false">غير نشط</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">الخدمة</th>
                <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">التصنيف</th>
                <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">السعر</th>
                <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">البائع</th>
                <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">الحالة</th>
                <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-gray-500">
                    <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="font-semibold">لا توجد خدمات</p>
                    <p className="text-sm mt-2">أضف خدمة جديدة للبدء</p>
                  </td>
                </tr>
              ) : (
                filteredServices.map((service) => (
                  <tr
                    key={service.id}
                    onClick={() => handleOpenServiceDetails(service)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {service.image_url && (
                          <img
                            src={service.image_url}
                            alt={service.name}
                            className="w-12 h-12 rounded-xl object-cover"
                          />
                        )}
                        <div>
                          <p className="font-bold text-sm text-gray-900">{service.name}</p>
                          <p className="text-xs text-gray-500">{service.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="default">{service.category}</Badge>
                    </td>
                    <td className="p-4">
                      <PriceTag amount={Number(service.price)} className="text-sm font-bold" />
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm font-bold text-gray-700">
                          {service.profiles?.full_name || 'غير معروف'}
                        </p>
                        <p className="text-xs text-gray-500">{service.profiles?.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={service.is_active ? 'success' : 'default'}>
                        {service.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenServiceDetails(service);
                          }}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Edit3 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFeatured(service.id, isFeatured(service.id));
                          }}
                          className="p-2 hover:bg-yellow-50 rounded-lg transition-colors"
                          title={isFeatured(service.id) ? 'إزالة من المميزة' : 'إضافة للمميزة'}
                        >
                          {isFeatured(service.id) ? (
                            <StarOff className="w-4 h-4 text-yellow-600" />
                          ) : (
                            <Star className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(service.id, service.is_active);
                          }}
                          className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                          title={service.is_active ? 'تعطيل الخدمة' : 'تفعيل الخدمة'}
                        >
                          {service.is_active ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteService(service.id);
                          }}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف الخدمة"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
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

      {/* Service Details Modal */}
      <Modal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        title="تفاصيل الخدمة"
        className="max-w-2xl"
      >
        {selectedService && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">اسم الخدمة</label>
              <Input
                value={serviceData.name || ''}
                onChange={e => setServiceData({ ...serviceData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">التصنيف</label>
                <select
                  value={serviceData.category || ''}
                  onChange={e => setServiceData({ ...serviceData, category: e.target.value })}
                  className="w-full p-3 rounded-lg border border-gray-200 focus:border-primary"
                >
                  {categories.filter(c => c !== 'الكل').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">السعر</label>
                <Input
                  type="number"
                  value={serviceData.price || ''}
                  onChange={e => setServiceData({ ...serviceData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">الوصف</label>
              <textarea
                value={serviceData.description || ''}
                onChange={e => setServiceData({ ...serviceData, description: e.target.value })}
                className="w-full p-3 rounded-lg border border-gray-200 focus:border-primary min-h-[100px]"
              />
            </div>
            <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={serviceData.is_active || false}
                onChange={e => setServiceData({ ...serviceData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm font-semibold text-gray-700">خدمة نشطة</span>
            </label>
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleSaveService} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="animate-spin" /> : 'حفظ التغييرات'}
              </Button>
              <Button onClick={() => setIsServiceModalOpen(false)} variant="outline">
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
