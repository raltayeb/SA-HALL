
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, POSItem, POS_CATEGORIES, StoreOrder } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { 
  Plus, Trash2, Package, Search, Loader2, Edit3, AlertTriangle, 
  Store, Tag, ShoppingBag, Truck, CheckCircle2, XCircle, User, Phone, MapPin
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';

export const AdminStore: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('orders'); // Default to orders to see sales
  
  // Products State
  const [items, setItems] = useState<POSItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<POSItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<POSItem>>({ category: 'عام' });
  const [saving, setSaving] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    // Fetch Products
    const { data: pData } = await supabase.from('pos_items').select('*').eq('vendor_id', user.id).order('created_at', { ascending: false });
    setItems(pData || []);
    setFilteredItems(pData || []);

    // Fetch Orders
    const { data: oData } = await supabase.from('store_orders').select('*').order('created_at', { ascending: false });
    setOrders(oData as any[] || []);
    
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user.id]);

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
    if (!currentItem.name || !currentItem.price) return;
    setSaving(true);
    
    // Ensure Admin has a hall/warehouse placeholder
    let hallId = currentItem.hall_id;
    if (!hallId) {
        const { data: hData } = await supabase.from('halls').select('id').eq('vendor_id', user.id).eq('name', 'المخزون الرئيسي').maybeSingle();
        if (hData) hallId = hData.id;
        else {
            const { data: newHall } = await supabase.from('halls').insert([{ vendor_id: user.id, name: 'المخزون الرئيسي', city: 'الرياض', price_per_night: 0, capacity: 0 }]).select().single();
            hallId = newHall?.id;
        }
    }

    const payload = {
      ...currentItem,
      vendor_id: user.id,
      hall_id: hallId,
      price: Number(currentItem.price),
      stock: Number(currentItem.stock || 0),
      category: currentItem.category || 'عام'
    };

    const { error } = currentItem.id 
      ? await supabase.from('pos_items').update(payload).eq('id', currentItem.id)
      : await supabase.from('pos_items').insert([payload]);

    if (!error) {
      toast({ title: 'تم الحفظ', variant: 'success' });
      setIsItemModalOpen(false);
      fetchData();
    } else {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const updateOrderStatus = async (orderId: string, status: string, delivery: string) => {
      const { error } = await supabase.from('store_orders').update({
          status: status,
          delivery_status: delivery
      }).eq('id', orderId);

      if(!error) {
          toast({ title: 'تم التحديث', variant: 'success' });
          setIsOrderModalOpen(false);
          fetchData();
      }
  };

  const handleDeleteItem = async (id: string) => {
      if(!confirm('هل أنت متأكد من حذف المنتج؟')) return;
      await supabase.from('pos_items').delete().eq('id', id);
      fetchData();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm gap-4">
         <div>
            <h2 className="text-3xl font-black text-primary flex items-center gap-2">
                <Store className="w-8 h-8" /> إدارة المتجر والطلبات
            </h2>
            <p className="text-sm text-gray-400 font-bold mt-1">المنتجات المعروضة للعامة ومتابعة طلبات الشراء.</p>
         </div>
         <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
            <button onClick={() => setActiveTab('orders')} className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'orders' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-900'}`}>الطلبات ({orders.filter(o => o.status === 'pending').length})</button>
            <button onClick={() => setActiveTab('products')} className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'products' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-900'}`}>المنتجات</button>
         </div>
      </div>

      {activeTab === 'products' && (
        <>
            <div className="flex justify-between items-center">
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar flex-1">
                    <button onClick={() => setSelectedCategory('الكل')} className={`px-5 py-2 rounded-xl font-bold whitespace-nowrap transition-all border ${selectedCategory === 'الكل' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}>الكل</button>
                    {POS_CATEGORIES.map(cat => (
                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2 rounded-xl font-bold whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}>{cat}</button>
                    ))}
                </div>
                <Button onClick={() => { setCurrentItem({ category: 'عام', stock: 100 }); setIsItemModalOpen(true); }} className="h-12 px-6 rounded-xl font-bold gap-2 shadow-lg shadow-primary/20 shrink-0 ml-4">
                    <Plus className="w-5 h-5" /> منتج جديد
                </Button>
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 overflow-hidden">
                <table className="w-full text-right border-separate border-spacing-y-2">
                    <thead className="text-gray-400 font-bold text-[10px] uppercase">
                        <tr>
                            <th className="px-4 pb-2">اسم المنتج</th>
                            <th className="px-4 pb-2">التصنيف</th>
                            <th className="px-4 pb-2">السعر</th>
                            <th className="px-4 pb-2">المخزون</th>
                            <th className="px-4 pb-2 text-center">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
                        ) : filteredItems.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-10 text-gray-400 font-bold">لا توجد منتجات. أضف أول منتج!</td></tr>
                        ) : filteredItems.map(item => (
                            <tr key={item.id} className="bg-gray-50/50 hover:bg-white transition-all group">
                                <td className="p-4 rounded-r-2xl font-bold text-gray-900 border-y border-r border-transparent group-hover:border-gray-100 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center text-primary"><Package className="w-5 h-5" /></div>
                                    {item.name}
                                </td>
                                <td className="p-4 text-sm text-gray-500 border-y border-transparent group-hover:border-gray-100"><span className="bg-white border px-2 py-1 rounded-lg text-xs font-bold">{item.category}</span></td>
                                <td className="p-4 border-y border-transparent group-hover:border-gray-100"><PriceTag amount={item.price} className="font-bold text-gray-800" /></td>
                                <td className="p-4 font-black text-lg text-gray-800 border-y border-transparent group-hover:border-gray-100">
                                    <div className="flex items-center gap-2">
                                        {item.stock}
                                        {item.stock < 10 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                    </div>
                                </td>
                                <td className="p-4 text-center rounded-l-2xl border-y border-l border-transparent group-hover:border-gray-100">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => { setCurrentItem(item); setIsItemModalOpen(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"><Edit3 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteItem(item.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
      )}

      {activeTab === 'orders' && (
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm min-h-[500px] flex flex-col">
              <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  <h3 className="font-black text-lg">سجل الطلبات الواردة</h3>
              </div>
              <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-right border-separate border-spacing-y-2">
                      <thead className="text-gray-400 font-bold text-[10px] uppercase">
                          <tr>
                              <th className="px-4 pb-2">رقم الطلب</th>
                              <th className="px-4 pb-2">العميل</th>
                              <th className="px-4 pb-2">عدد المواد</th>
                              <th className="px-4 pb-2">الإجمالي</th>
                              <th className="px-4 pb-2">حالة التوصيل</th>
                              <th className="px-4 pb-2 text-center">التاريخ</th>
                          </tr>
                      </thead>
                      <tbody>
                          {orders.map(order => (
                              <tr 
                                key={order.id} 
                                onClick={() => { setSelectedOrder(order); setIsOrderModalOpen(true); }}
                                className="bg-gray-50/50 hover:bg-white transition-all cursor-pointer group"
                              >
                                  <td className="p-4 rounded-r-2xl font-mono text-xs font-bold text-gray-500 border-y border-r border-transparent group-hover:border-gray-100">
                                      #{order.id.slice(0, 8)}
                                  </td>
                                  <td className="p-4 font-bold text-gray-900 border-y border-transparent group-hover:border-gray-100">
                                      {order.guest_info?.name || 'مستخدم مسجل'}
                                      <div className="text-[10px] text-gray-400 font-normal">{order.guest_info?.phone}</div>
                                  </td>
                                  <td className="p-4 border-y border-transparent group-hover:border-gray-100">
                                      <span className="bg-white border px-2 py-1 rounded-lg text-xs font-bold">{order.items.reduce((s,i) => s + i.qty, 0)} منتج</span>
                                  </td>
                                  <td className="p-4 border-y border-transparent group-hover:border-gray-100">
                                      <PriceTag amount={order.total_amount} className="font-black text-primary" />
                                  </td>
                                  <td className="p-4 border-y border-transparent group-hover:border-gray-100">
                                      <Badge variant={order.delivery_status === 'delivered' ? 'success' : order.delivery_status === 'pending' ? 'warning' : 'default'}>
                                          {order.delivery_status === 'pending' ? 'قيد الانتظار' : order.delivery_status === 'shipped' ? 'جاري التوصيل' : 'تم التوصيل'}
                                      </Badge>
                                  </td>
                                  <td className="p-4 text-center rounded-l-2xl border-y border-l border-transparent group-hover:border-gray-100 text-xs text-gray-400 font-bold">
                                      {format(new Date(order.created_at), 'dd/MM/yyyy')}
                                  </td>
                              </tr>
                          ))}
                          {orders.length === 0 && (
                              <tr><td colSpan={6} className="text-center py-10 text-gray-400 font-bold">لا توجد طلبات جديدة</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* Product Modal */}
      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title={currentItem.id ? 'تعديل المنتج' : 'إضافة منتج للمتجر'}>
         <div className="space-y-4 text-right">
            <Input label="اسم الصنف" value={currentItem.name || ''} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} className="h-12 rounded-xl" />
            <div className="grid grid-cols-2 gap-4">
               <Input label="السعر" type="number" value={currentItem.price || ''} onChange={e => setCurrentItem({...currentItem, price: Number(e.target.value)})} className="h-12 rounded-xl" />
               <Input label="الكمية (المخزون)" type="number" value={currentItem.stock || ''} onChange={e => setCurrentItem({...currentItem, stock: Number(e.target.value)})} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">التصنيف</label>
                <select className="w-full h-12 border border-gray-200 rounded-xl px-4 font-bold bg-white focus:ring-2 focus:ring-primary/10 outline-none" value={currentItem.category} onChange={e => setCurrentItem({...currentItem, category: e.target.value})}>
                    {POS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <Button onClick={handleSaveItem} disabled={saving} className="w-full h-14 rounded-xl font-black mt-4">
                {saving ? <Loader2 className="animate-spin" /> : 'حفظ البيانات'}
            </Button>
         </div>
      </Modal>

      {/* Order Details Modal */}
      <Modal isOpen={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} title="تفاصيل الطلب" className="max-w-2xl">
          {selectedOrder && (
              <div className="space-y-6 text-right">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                      <div>
                          <p className="text-xs font-bold text-gray-400">رقم الطلب</p>
                          <p className="font-mono font-black text-lg">#{selectedOrder.id.slice(0, 8)}</p>
                      </div>
                      <div className="text-left">
                          <p className="text-xs font-bold text-gray-400">الإجمالي</p>
                          <PriceTag amount={selectedOrder.total_amount} className="text-xl font-black text-primary" />
                      </div>
                  </div>

                  <div className="space-y-3">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><User className="w-4 h-4" /> بيانات العميل</h4>
                      <div className="bg-white border border-gray-200 p-4 rounded-2xl space-y-2">
                          <div className="flex justify-between">
                              <span className="text-gray-500 font-bold text-sm">الاسم:</span>
                              <span className="font-black">{selectedOrder.guest_info?.name || 'مستخدم مسجل'}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-gray-500 font-bold text-sm">الجوال:</span>
                              <span className="font-black">{selectedOrder.guest_info?.phone}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-gray-500 font-bold text-sm">العنوان:</span>
                              <span className="font-black text-sm max-w-[200px] text-left">{selectedOrder.guest_info?.address}</span>
                          </div>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Package className="w-4 h-4" /> المنتجات</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                          {selectedOrder.items.map((item, i) => (
                              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                  <span className="font-bold text-sm">{item.name} <span className="text-gray-400 text-xs">x{item.qty}</span></span>
                                  <span className="font-mono font-bold text-sm">{item.price * item.qty} SAR</span>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex gap-3">
                      <Button variant="outline" onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled', 'cancelled')} className="flex-1 rounded-xl h-12 text-red-500 hover:text-red-600 border-red-100 hover:bg-red-50 font-bold">
                          إلغاء الطلب
                      </Button>
                      {selectedOrder.delivery_status === 'pending' && (
                          <Button onClick={() => updateOrderStatus(selectedOrder.id, 'pending', 'shipped')} className="flex-[2] rounded-xl h-12 font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200">
                              <Truck className="w-4 h-4 ml-2" /> تأكيد الشحن
                          </Button>
                      )}
                      {selectedOrder.delivery_status === 'shipped' && (
                          <Button onClick={() => updateOrderStatus(selectedOrder.id, 'completed', 'delivered')} className="flex-[2] rounded-xl h-12 font-black bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200">
                              <CheckCircle2 className="w-4 h-4 ml-2" /> تم التوصيل
                          </Button>
                      )}
                  </div>
              </div>
          )}
      </Modal>
    </div>
  );
};
