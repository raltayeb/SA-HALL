import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import {
  Users, Search, Loader2, Star, StarOff, CheckCircle2, XCircle,
  Building2, Mail, Phone, Edit3, Shield, UserCheck, UserX
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface Subscriber {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'vendor' | 'super_admin';
  is_enabled: boolean;
  status: 'pending' | 'approved' | 'rejected';
  phone_number?: string;
  business_name?: string;
  hall_limit?: number;
  service_limit?: number;
  subscription_plan?: string;
  created_at: string;
}

interface Hall {
  id: string;
  name: string;
  city: string;
  is_active: boolean;
}

export const SubscribersManagement: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [filteredSubscribers, setFilteredSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal state
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isHallsModalOpen, setIsHallsModalOpen] = useState(false);
  const [subscriberHalls, setSubscriberHalls] = useState<Hall[]>([]);

  useEffect(() => {
    fetchSubscribers();
  }, []);

  useEffect(() => {
    filterSubscribers();
  }, [searchQuery, roleFilter, statusFilter, subscribers]);

  const fetchSubscribers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['user', 'vendor'])
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      setSubscribers(data || []);
    }
    setLoading(false);
  };

  const filterSubscribers = () => {
    let filtered = [...subscribers];

    if (searchQuery) {
      filtered = filtered.filter(sub =>
        sub.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.phone_number?.includes(searchQuery)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(sub => sub.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }

    setFilteredSubscribers(filtered);
  };

  const handleOpenDetails = (subscriber: Subscriber) => {
    setSelectedSubscriber(subscriber);
    setIsDetailsModalOpen(true);
  };

  const handleToggleEnabled = async (subscriberId: string, currentEnabled: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_enabled: !currentEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriberId);

      if (error) throw error;

      toast({
        title: 'تم التحديث',
        description: currentEnabled ? 'تم تعطيل المشترك' : 'تم تفعيل المشترك',
        variant: 'success'
      });
      fetchSubscribers();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (subscriberId: string, newStatus: 'approved' | 'rejected') => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriberId);

      if (error) throw error;

      toast({
        title: 'تم التحديث',
        description: newStatus === 'approved' ? 'تم قبول المشترك' : 'تم رفض المشترك',
        variant: 'success'
      });
      fetchSubscribers();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenHalls = async (subscriber: Subscriber) => {
    setSelectedSubscriber(subscriber);
    await fetchSubscriberHalls(subscriber.id);
    setIsHallsModalOpen(true);
  };

  const fetchSubscriberHalls = async (userId: string) => {
    const { data } = await supabase
      .from('halls')
      .select('id, name, city, is_active')
      .eq('vendor_id', userId)
      .order('name');
    
    setSubscriberHalls(data || []);
  };

  const handleToggleHallActive = async (hallId: string, isActive: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('halls')
        .update({
          is_active: !isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', hallId);

      if (error) throw error;

      toast({
        title: 'تم التحديث',
        description: isActive ? 'تم تعطيل القاعة' : 'تم تفعيل القاعة',
        variant: 'success'
      });
      fetchSubscriberHalls(selectedSubscriber!.id);
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-ruqaa text-primary">إدارة المشتركين</h2>
              <p className="text-gray-500 font-bold text-sm">تحكم كامل في حسابات المشتركين</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-3xl font-black text-primary">{filteredSubscribers.length}</p>
            <p className="text-xs font-bold text-gray-500">مشترك</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="البحث بالاسم أو البريد أو رقم الجوال..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 focus:border-primary focus:outline-none"
          >
            <option value="all">جميع الأدوار</option>
            <option value="user">مستخدم</option>
            <option value="vendor">شريك (بائع)</option>
          </select>
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase">المشترك</th>
                <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase">الدور</th>
                <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase">الحالة</th>
                <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase">التفعيل</th>
                <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase">القاعات</th>
                <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-gray-500 font-bold">
                    لا يوجد مشتركين
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => handleOpenDetails(sub)}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black">
                          {sub.full_name?.charAt(0) || sub.email.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-900">{sub.full_name || 'غير محدد'}</p>
                          <p className="text-xs text-gray-500">{sub.email}</p>
                          {sub.phone_number && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {sub.phone_number}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={sub.role === 'vendor' ? 'warning' : 'default'}>
                        {sub.role === 'vendor' ? 'شريك' : 'مستخدم'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={sub.status === 'approved' ? 'success' : sub.status === 'rejected' ? 'destructive' : 'default'}
                      >
                        {sub.status === 'approved' ? 'مقبول' : sub.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={sub.is_enabled ? 'success' : 'default'}>
                        {sub.is_enabled ? 'مفعل' : 'معطل'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenHalls(sub);
                        }}
                        className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <Building2 className="w-4 h-4" />
                        عرض القاعات
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetails(sub);
                          }}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Edit3 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleEnabled(sub.id, sub.is_enabled);
                          }}
                          className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                          title={sub.is_enabled ? 'تعطيل' : 'تفعيل'}
                        >
                          {sub.is_enabled ? (
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

      {/* Subscriber Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="تفاصيل المشترك"
        className="max-w-2xl"
      >
        {selectedSubscriber && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-2xl">
                {selectedSubscriber.full_name?.charAt(0) || selectedSubscriber.email.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-gray-900">{selectedSubscriber.full_name || 'غير محدد'}</h3>
                <p className="text-sm text-gray-500">{selectedSubscriber.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">رقم الجوال</label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-bold text-gray-700">
                    {selectedSubscriber.phone_number || 'غير متوفر'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">الاسم التجاري</label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-bold text-gray-700">
                    {selectedSubscriber.business_name || 'غير متوفر'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">الباقة</label>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-bold text-gray-700">
                    {selectedSubscriber.subscription_plan || 'أساسية'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">تاريخ الانضمام</label>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-bold text-gray-700">
                    {new Date(selectedSubscriber.created_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-700">حالة الحساب</h4>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm font-bold text-gray-700">تفعيل الحساب</span>
                <button
                  onClick={() => handleToggleEnabled(selectedSubscriber.id, selectedSubscriber.is_enabled)}
                  disabled={saving}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    selectedSubscriber.is_enabled
                      ? 'bg-green-100 text-green-600 hover:bg-green-200'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {selectedSubscriber.is_enabled ? 'مفعل' : 'معطل'}
                </button>
              </div>

              {selectedSubscriber.status !== 'approved' && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleUpdateStatus(selectedSubscriber.id, 'approved')}
                    disabled={saving}
                    className="flex-1 gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    قبول المشترك
                  </Button>
                  <Button
                    onClick={() => handleUpdateStatus(selectedSubscriber.id, 'rejected')}
                    disabled={saving}
                    variant="destructive"
                    className="flex-1 gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    رفض المشترك
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={() => setIsDetailsModalOpen(false)} className="flex-1">
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Halls Modal */}
      <Modal
        isOpen={isHallsModalOpen}
        onClose={() => setIsHallsModalOpen(false)}
        title="قاعات المشترك"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          {subscriberHalls.length === 0 ? (
            <div className="p-8 text-center text-gray-500 font-bold">
              لا توجد قاعات مضافة
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {subscriberHalls.map(hall => {
                return (
                  <div
                    key={hall.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-sm text-gray-900">{hall.name}</p>
                      <p className="text-xs text-gray-500">{hall.city}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleHallActive(hall.id, hall.is_active)}
                        className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                        title={hall.is_active ? 'تعطيل القاعة' : 'تفعيل القاعة'}
                      >
                        {hall.is_active ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
