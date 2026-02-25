import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import {
  Tag, Plus, Edit3, Trash2, Loader2, Calendar, Percent, Wallet,
  CheckCircle2, XCircle, Copy, Search
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase: number;
  max_discount: number | null;
  usage_limit: number | null;
  usage_count: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  applicable_to: 'all' | 'halls' | 'services';
  created_at: string;
}

export const CouponsManagement: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCoupon, setCurrentCoupon] = useState<Partial<Coupon>>({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    min_purchase: 0,
    max_discount: null,
    usage_limit: null,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true,
    applicable_to: 'all'
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  useEffect(() => {
    filterCoupons();
  }, [searchQuery, statusFilter, coupons]);

  const fetchCoupons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      setCoupons(data || []);
    }
    setLoading(false);
  };

  const filterCoupons = () => {
    let filtered = [...coupons];

    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      const now = new Date().toISOString();
      if (statusFilter === 'active') {
        filtered = filtered.filter(c => 
          c.is_active && (!c.end_date || c.end_date > now)
        );
      } else if (statusFilter === 'expired') {
        filtered = filtered.filter(c => 
          c.end_date && c.end_date < now
        );
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(c => !c.is_active);
      }
    }

    setFilteredCoupons(filtered);
  };

  const handleOpenModal = (coupon?: Coupon) => {
    if (coupon) {
      setCurrentCoupon({
        ...coupon,
        start_date: coupon.start_date.split('T')[0],
        end_date: coupon.end_date ? coupon.end_date.split('T')[0] : ''
      });
    } else {
      setCurrentCoupon({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 10,
        min_purchase: 0,
        max_discount: null,
        usage_limit: null,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        is_active: true,
        applicable_to: 'all'
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveCoupon = async () => {
    if (!currentCoupon.code || !currentCoupon.discount_value) {
      toast({ title: 'خطأ', description: 'الرجاء إدخال جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const couponData: any = {
        code: currentCoupon.code.toUpperCase().trim(),
        description: currentCoupon.description,
        discount_type: currentCoupon.discount_type,
        discount_value: currentCoupon.discount_value,
        min_purchase: currentCoupon.min_purchase || 0,
        max_discount: currentCoupon.max_discount,
        usage_limit: currentCoupon.usage_limit,
        start_date: new Date(currentCoupon.start_date!).toISOString(),
        end_date: currentCoupon.end_date ? new Date(currentCoupon.end_date).toISOString() : null,
        is_active: currentCoupon.is_active,
        applicable_to: currentCoupon.applicable_to,
        updated_at: new Date().toISOString()
      };

      let error;
      if (currentCoupon.id) {
        const result = await supabase
          .from('coupons')
          .update(couponData)
          .eq('id', currentCoupon.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('coupons')
          .insert([couponData]);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: 'تم الحفظ',
        description: currentCoupon.id ? 'تم تحديث الكوبون' : 'تم إنشاء الكوبون بنجاح',
        variant: 'success'
      });
      setIsModalOpen(false);
      fetchCoupons();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCoupon = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;

    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'تم الحذف', description: 'تم حذف الكوبون بنجاح', variant: 'success' });
    fetchCoupons();
  };

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    toast({ title: 'تم النسخ', description: 'تم نسخ رمز الكوبون', variant: 'success' });
  };

  const isExpired = (endDate: string | null) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">كوبونات الخصم</h2>
          <p className="text-sm text-gray-500 mt-1">أدر كوبونات الخصم للمشتركين</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-4 h-4" />
          كوبون جديد
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="البحث باسم الكوبون..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none"
          >
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="expired">منتهي الصلاحية</option>
            <option value="inactive">غير نشط</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">الكوبون</th>
                <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">نوع الخصم</th>
                <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">الحد الأدنى</th>
                <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">الاستخدامات</th>
                <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">الصلاحية</th>
                <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">الحالة</th>
                <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center text-gray-500">
                    <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="font-semibold">لا توجد كوبونات</p>
                    <p className="text-sm mt-2">أنشئ كوبون خصم جديد للبدء</p>
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((coupon) => (
                  <tr
                    key={coupon.id}
                    onClick={() => handleOpenModal(coupon)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          {coupon.discount_type === 'percentage' ? (
                            <Percent className="w-4 h-4" />
                          ) : (
                            <Wallet className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{coupon.code}</p>
                            <button
                              onClick={(e) => handleCopyCode(coupon.code, e)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                              title="نسخ الكود"
                            >
                              <Copy className="w-3 h-3 text-gray-600" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-500">{coupon.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {coupon.discount_type === 'percentage' 
                            ? `${coupon.discount_value}%` 
                            : `${coupon.discount_value} ر.س`}
                        </p>
                        {coupon.max_discount && coupon.discount_type === 'percentage' && (
                          <p className="text-xs text-gray-500">بحد أقصى {coupon.max_discount} ر.س</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-gray-900">{coupon.min_purchase} ر.س</p>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-semibold text-gray-900">{coupon.usage_count}</p>
                        {coupon.usage_limit && (
                          <p className="text-xs text-gray-500">من {coupon.usage_limit}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <p className="font-semibold text-gray-900">
                          {new Date(coupon.start_date).toLocaleDateString('ar-SA')}
                        </p>
                        {coupon.end_date && (
                          <p className={`text-xs ${isExpired(coupon.end_date) ? 'text-red-600' : 'text-gray-500'}`}>
                            إلى {new Date(coupon.end_date).toLocaleDateString('ar-SA')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={
                        coupon.is_active && !isExpired(coupon.end_date) ? 'success' :
                        isExpired(coupon.end_date) ? 'destructive' : 'default'
                      }>
                        {isExpired(coupon.end_date) ? 'منتهي' : coupon.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(coupon);
                          }}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Edit3 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteCoupon(coupon.id, e)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف"
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

      {/* Coupon Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentCoupon.id ? 'تعديل الكوبون' : 'إنشاء كوبون جديد'}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">رمز الكوبون *</label>
            <Input
              value={currentCoupon.code}
              onChange={e => setCurrentCoupon({ ...currentCoupon, code: e.target.value.toUpperCase() })}
              placeholder="مثال: SUMMER2025"
              className="font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">الوصف</label>
            <textarea
              value={currentCoupon.description}
              onChange={e => setCurrentCoupon({ ...currentCoupon, description: e.target.value })}
              placeholder="وصف الكوبون..."
              className="w-full p-3 rounded-lg border border-gray-200 focus:border-primary focus:outline-none min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">نوع الخصم *</label>
              <select
                value={currentCoupon.discount_type}
                onChange={e => setCurrentCoupon({ ...currentCoupon, discount_type: e.target.value as any })}
                className="w-full p-3 rounded-lg border border-gray-200 focus:border-primary"
              >
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed">مبلغ ثابت (ر.س)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">قيمة الخصم *</label>
              <Input
                type="number"
                value={currentCoupon.discount_value}
                onChange={e => setCurrentCoupon({ ...currentCoupon, discount_value: parseFloat(e.target.value) || 0 })}
                placeholder={currentCoupon.discount_type === 'percentage' ? '10' : '100'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">الحد الأدنى للشراء</label>
              <Input
                type="number"
                value={currentCoupon.min_purchase}
                onChange={e => setCurrentCoupon({ ...currentCoupon, min_purchase: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                {currentCoupon.discount_type === 'percentage' ? 'الحد الأقصى للخصم' : 'اتركه فارغاً'}
              </label>
              <Input
                type="number"
                value={currentCoupon.max_discount || ''}
                onChange={e => setCurrentCoupon({ ...currentCoupon, max_discount: parseFloat(e.target.value) || null })}
                placeholder="500"
                disabled={currentCoupon.discount_type === 'fixed'}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">حد الاستخدام</label>
            <Input
              type="number"
              value={currentCoupon.usage_limit || ''}
              onChange={e => setCurrentCoupon({ ...currentCoupon, usage_limit: parseInt(e.target.value) || null })}
              placeholder="اتركه فارغاً لاستخدام غير محدود"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">تاريخ البدء *</label>
              <Input
                type="date"
                value={currentCoupon.start_date}
                onChange={e => setCurrentCoupon({ ...currentCoupon, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">تاريخ الانتهاء</label>
              <Input
                type="date"
                value={currentCoupon.end_date || ''}
                onChange={e => setCurrentCoupon({ ...currentCoupon, end_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">ينطبق على</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCurrentCoupon({ ...currentCoupon, applicable_to: 'all' })}
                className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                  currentCoupon.applicable_to === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setCurrentCoupon({ ...currentCoupon, applicable_to: 'halls' })}
                className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                  currentCoupon.applicable_to === 'halls'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                القاعات
              </button>
              <button
                type="button"
                onClick={() => setCurrentCoupon({ ...currentCoupon, applicable_to: 'services' })}
                className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                  currentCoupon.applicable_to === 'services'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                الخدمات
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={currentCoupon.is_active}
              onChange={e => setCurrentCoupon({ ...currentCoupon, is_active: e.target.checked })}
              className="w-4 h-4 text-primary"
            />
            <span className="text-sm font-semibold text-gray-700">كوبون نشط</span>
          </label>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSaveCoupon} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="animate-spin" /> : 'حفظ الكوبون'}
            </Button>
            <Button onClick={() => setIsModalOpen(false)} variant="outline">
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
