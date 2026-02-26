import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { POSItem, POS_CATEGORIES, StoreOrder } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import {
  Plus, Trash2, Package, Search, Loader2, Edit3, AlertTriangle,
  Tag, ShoppingBag, CheckCircle2, XCircle
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const AdminStore: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'stock'>('orders');
  const [items, setItems] = useState<POSItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<POSItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<POSItem>>({ category: 'عام' });
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [stockAlertItems, setStockAlertItems] = useState<POSItem[]>([]);

  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all products (admin view)
      const { data: pData, error: pError } = await supabase.from('pos_items').select('*').order('stock', { ascending: true });
      if (pError) throw pError;
      setItems(pData || []);
      setFilteredItems(pData || []);

      // Calculate stock alerts (items with less than 5% remaining)
      const alerts = (pData || []).filter(item => {
        const initialStock = 100; // Assuming initial stock is 100
        const remainingPercent = (Number(item.stock) / initialStock) * 100;
        return remainingPercent < 5;
      }).slice(0, 10);
      setStockAlertItems(alerts);

      // Fetch all orders
      const { data: oData, error: oError } = await supabase.from('store_orders').select('*').order('created_at', { ascending: false });
      if (oError) throw oError;
      setOrders(oData as any[] || []);
    } catch (error: any) {
      console.error('Error fetching store data:', error);
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    let res = items;
    if (selectedCategory !== 'الكل') {
      res = res.filter(i => i.category === selectedCategory);
    }
    if (searchQuery) {
      res = res.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    setFilteredItems(res);
  }, [searchQuery, selectedCategory, items]);

  const handleSaveItem = async () => {
    if (!currentItem.name || !currentItem.price) {
      toast({ title: 'خطأ', description: 'الاسم والسعر مطلوبان', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const payload = {
      ...currentItem,
      price: Number(currentItem.price),
      stock: Number(currentItem.stock) || 0
    };

    try {
      let error;
      if (currentItem.id) {
        const result = await supabase.from('pos_items').update(payload).eq('id', currentItem.id);
        error = result.error;
      } else {
        const result = await supabase.from('pos_items').insert([payload]);
        error = result.error;
      }

      if (error) throw error;

      toast({ title: 'تم الحفظ', variant: 'success' });
      setIsItemModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف المنتج؟')) return;
    const { error } = await supabase.from('pos_items').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'تم الحذف', variant: 'success' });
    fetchData();
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from('store_orders').update({ status }).eq('id', orderId);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'تم التحديث', variant: 'success' });
    setIsOrderModalOpen(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إدارة المتجر</h2>
          <p className="text-sm text-gray-500 mt-1">إدارة المنتجات والطلبات</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'orders'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                الطلبات
              </div>
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-6 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'products'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                المنتجات
              </div>
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-6 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'stock'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                تنبيهات المخزون
                {stockAlertItems.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {stockAlertItems.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'orders' ? (
            /* Orders Table */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">رقم الطلب</th>
                    <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">العميل</th>
                    <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">الإجمالي</th>
                    <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">الحالة</th>
                    <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">التاريخ</th>
                    <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-20 text-center text-gray-500">
                        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="font-semibold">لا توجد طلبات</p>
                      </td>
                    </tr>
                  ) : (
                    orders.map((order, index) => (
                      <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4">
                          <p className="text-sm font-semibold text-gray-900">#{index + 1000}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-gray-700">{order.guest_info?.phone || order.user_id || '-'}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-bold text-gray-900">
                            {Number(order.total_amount).toLocaleString()} ر.س
                          </p>
                        </td>
                        <td className="p-4">
                          <Badge variant={
                            order.status === 'completed' ? 'success' :
                            order.status === 'cancelled' ? 'destructive' : 'default'
                          }>
                            {order.status === 'completed' ? 'مكتمل' :
                             order.status === 'cancelled' ? 'ملغي' : 'قيد المعالجة'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-gray-700">
                            {new Date(order.created_at).toLocaleDateString('ar-SA')}
                          </p>
                        </td>
                        <td className="p-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsOrderModalOpen(true);
                            }}
                            className="text-xs"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'stock' ? (
            /* Stock Alerts Section */
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-900">تنبيهات المخزون المنخفض</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      المنتجات التي يقل مخزونها عن 5% من الكمية الأولية
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">المنتج</th>
                      <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">التصنيف</th>
                      <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">المخزون الحالي</th>
                      <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">نسبة المتبقي</th>
                      <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">الحالة</th>
                      <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockAlertItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-20 text-center text-gray-500">
                          <CheckCircle2 className="w-16 h-16 text-green-300 mx-auto mb-4" />
                          <p className="font-semibold">لا توجد تنبيهات مخزون</p>
                          <p className="text-sm mt-2">جميع المنتجات لديها مخزون كافي</p>
                        </td>
                      </tr>
                    ) : (
                      stockAlertItems.map((item) => {
                        const remainingPercent = (Number(item.stock) / 100) * 100;
                        return (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-4">
                              <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                            </td>
                            <td className="p-4">
                              <p className="text-sm text-gray-700">{item.category || 'عام'}</p>
                            </td>
                            <td className="p-4">
                              <Badge variant="destructive">{item.stock} قطعة</Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      remainingPercent < 5 ? 'bg-red-500' : 'bg-yellow-500'
                                    }`}
                                    style={{ width: `${remainingPercent}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-bold text-gray-700">{remainingPercent.toFixed(1)}%</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant="destructive">منخفض جداً</Badge>
                            </td>
                            <td className="p-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCurrentItem(item);
                                  setIsItemModalOpen(true);
                                }}
                                className="text-xs"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Products Section */
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex justify-between items-center">
                <div className="flex gap-2 overflow-x-auto">
                  <button
                    onClick={() => setSelectedCategory('الكل')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors border ${
                      selectedCategory === 'الكل'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    الكل
                  </button>
                  {POS_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors border ${
                        selectedCategory === cat
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={() => {
                    setCurrentItem({ category: 'عام', stock: 100 });
                    setIsItemModalOpen(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  منتج جديد
                </Button>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.length === 0 ? (
                  <div className="col-span-full text-center py-16 bg-gray-50 rounded-lg border border-gray-200">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="font-semibold text-gray-500">لا توجد منتجات</p>
                  </div>
                ) : (
                  filteredItems.map(item => (
                    <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Tag className="w-5 h-5" />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setCurrentItem(item);
                              setIsItemModalOpen(true);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2">{item.name}</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">السعر:</span>
                          <span className="font-bold text-gray-900">
                            <PriceTag amount={Number(item.price)} className="text-sm" />
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">التصنيف:</span>
                          <span className="font-semibold text-gray-700">{item.category || 'عام'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">المخزون:</span>
                          <Badge variant={Number(item.stock) > 10 ? 'success' : Number(item.stock) > 0 ? 'warning' : 'destructive'}>
                            {item.stock || 0} قطعة
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Modal */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={currentItem.id ? 'تعديل المنتج' : 'إضافة منتج جديد'}
        className="max-w-xl"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">اسم المنتج *</label>
            <Input
              value={currentItem.name || ''}
              onChange={e => setCurrentItem({ ...currentItem, name: e.target.value })}
              placeholder="اسم المنتج"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">السعر *</label>
              <Input
                type="number"
                value={currentItem.price || ''}
                onChange={e => setCurrentItem({ ...currentItem, price: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">المخزون</label>
              <Input
                type="number"
                value={currentItem.stock || ''}
                onChange={e => setCurrentItem({ ...currentItem, stock: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">التصنيف</label>
            <select
              value={currentItem.category || 'عام'}
              onChange={e => setCurrentItem({ ...currentItem, category: e.target.value })}
              className="w-full p-3 rounded-lg border border-gray-200 focus:border-primary focus:outline-none"
            >
              {POS_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSaveItem} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="animate-spin" /> : 'حفظ'}
            </Button>
            <Button onClick={() => setIsItemModalOpen(false)} variant="outline">
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>

      {/* Order Modal */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="تفاصيل الطلب"
        className="max-w-xl"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-gray-500 mb-1">رقم الطلب</p>
              <p className="font-bold text-gray-900">#{orders.indexOf(selectedOrder) + 1000}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-gray-500 mb-1">الإجمالي</p>
              <p className="font-bold text-gray-900">
                <PriceTag amount={Number(selectedOrder.total_amount)} className="text-lg" />
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">حالة الطلب</label>
              <div className="space-y-2">
                <button
                  onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}
                  className="w-full text-right px-4 py-3 rounded-lg bg-green-50 hover:bg-green-100 text-sm font-semibold text-green-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  مكتمل
                </button>
                <button
                  onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                  className="w-full text-right px-4 py-3 rounded-lg bg-red-50 hover:bg-red-100 text-sm font-semibold text-red-700 transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  ملغي
                </button>
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={() => setIsOrderModalOpen(false)} className="flex-1">
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
