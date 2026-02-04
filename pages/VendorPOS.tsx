
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, POSItem, Hall, POS_CATEGORIES } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { Modal } from '../components/ui/Modal';
import { 
  ShoppingCart, Plus, Minus, Trash2, Package, Search, PlusCircle, 
  Building2, Loader2, Receipt, Printer, LayoutGrid, ScanBarcode, RefreshCcw, 
  Boxes, Edit3, AlertTriangle, ArrowLeftRight
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface CartItem {
  item: POSItem;
  qty: number;
}

export const VendorPOS: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory'>('pos');
  const [items, setItems] = useState<POSItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<POSItem[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [selectedHallId, setSelectedHallId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<POSItem>>({ category: 'عام' });

  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchHalls = useCallback(async () => {
    try {
      const { data: hData } = await supabase.from('halls').select('*').eq('vendor_id', user.id);
      setHalls(hData || []);
      if (hData?.[0] && !selectedHallId) setSelectedHallId(hData[0].id);
    } catch (err) {
      console.error(err);
    }
  }, [user.id]);

  const fetchItems = useCallback(async () => {
    if (!selectedHallId) return;
    setLoading(true);
    try {
      const { data: iData } = await supabase.from('pos_items').select('*').eq('hall_id', selectedHallId);
      setItems(iData || []);
      setFilteredItems(iData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedHallId]);

  useEffect(() => { fetchHalls(); }, [fetchHalls]);
  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    let res = items;
    if (selectedCategory !== 'الكل') {
      res = res.filter(i => i.category === selectedCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      res = res.filter(i => i.name.toLowerCase().includes(q) || i.barcode?.includes(q));
      const exactMatch = items.find(i => i.barcode === searchQuery);
      if (exactMatch && activeTab === 'pos') {
        addToCart(exactMatch);
        setSearchQuery('');
      }
    }
    setFilteredItems(res);
  }, [searchQuery, selectedCategory, items, activeTab]);

  const addToCart = (item: POSItem) => {
    if (item.stock <= 0) {
        toast({ title: 'تنبيه', description: 'المنتج غير متوفر في المخزون', variant: 'warning' });
        return;
    }
    setCart(prev => {
      const exists = prev.find(i => i.item.id === item.id);
      if (exists) {
          if (exists.qty >= item.stock) {
              toast({ title: 'تنبيه', description: 'الكمية المطلوبة تتجاوز المخزون', variant: 'warning' });
              return prev;
          }
          return prev.map(i => i.item.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { item, qty: 1 }];
    });
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3');
    audio.volume = 0.2;
    audio.play().catch(() => {});
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.item.id === id) {
        const itemStock = items.find(it => it.id === id)?.stock || 0;
        const newQty = Math.max(1, i.qty + delta);
        if (newQty > itemStock) {
            toast({ title: 'تنبيه', description: 'لا يوجد مخزون كافي', variant: 'warning' });
            return i;
        }
        return { ...i, qty: newQty };
      }
      return i;
    }));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.item.id !== id));
  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((sum, i) => sum + (Number(i.item.price) * i.qty), 0);
  const taxRate = user.pos_config?.tax_rate ?? 15;
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    const receipt = {
      orderId: `#${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleString('ar-SA'),
      items: cart,
      subtotal,
      taxAmount,
      total,
      vendor: user
    };
    setReceiptData(receipt);
    setPaymentModalOpen(true);
    setIsProcessing(false);
  };

  const confirmPayment = async () => {
    // Deduct Stock
    for (const cartItem of cart) {
        const newStock = Math.max(0, cartItem.item.stock - cartItem.qty);
        await supabase.from('pos_items').update({ stock: newStock }).eq('id', cartItem.item.id);
    }
    
    if (user.pos_config?.auto_print) {
        setTimeout(() => window.print(), 500);
    }
    toast({ title: 'تمت العملية', description: 'تم تسجيل عملية البيع وتحديث المخزون.', variant: 'success' });
    setCart([]);
    setPaymentModalOpen(false);
    fetchItems();
  };

  const handleSaveItem = async () => {
    if (!currentItem.name || !currentItem.price || !selectedHallId) return;
    const payload = {
      ...currentItem,
      vendor_id: user.id,
      hall_id: selectedHallId,
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
      setCurrentItem({ category: 'عام' });
      fetchItems();
    }
  };

  const handleDeleteItem = async (id: string) => {
      if(!confirm('هل أنت متأكد من حذف المنتج؟')) return;
      await supabase.from('pos_items').delete().eq('id', id);
      fetchItems();
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4 overflow-hidden">
      
      {/* Top Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm shrink-0">
         <div className="flex items-center gap-4">
            <div className="flex bg-gray-100 p-1 rounded-xl">
               <button onClick={() => setActiveTab('pos')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'pos' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>نقطة البيع</button>
               <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'inventory' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>المخزون</button>
            </div>
            <div className="h-8 w-[1px] bg-gray-200"></div>
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
               <Building2 className="w-4 h-4 text-gray-400" />
               <select className="bg-transparent border-none text-sm font-bold outline-none cursor-pointer min-w-[120px]" value={selectedHallId} onChange={e => setSelectedHallId(e.target.value)}>
                 {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
               </select>
            </div>
         </div>
         <div className="flex items-center gap-3 w-full max-w-md">
            <div className="flex-1 relative">
               <input 
                 ref={searchInputRef}
                 className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-10 text-right font-bold outline-none focus:ring-2 ring-primary/20"
                 placeholder="بحث أو مسح باركود..."
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
               />
               <ScanBarcode className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
            <Button onClick={() => { setCurrentItem({ category: 'عام', stock: 100 }); setIsItemModalOpen(true); }} className="h-12 w-12 rounded-2xl p-0 flex items-center justify-center bg-gray-900 text-white hover:bg-black shadow-lg">
               <Plus className="w-6 h-6" />
            </Button>
         </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
         
         {activeTab === 'pos' ? (
             <>
                {/* Left Side: Product Grid */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 shrink-0">
                    <button onClick={() => setSelectedCategory('الكل')} className={`px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all shadow-sm ${selectedCategory === 'الكل' ? 'bg-primary text-white shadow-primary/30' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>الكل</button>
                    {POS_CATEGORIES.map(cat => (
                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all shadow-sm ${selectedCategory === cat ? 'bg-primary text-white shadow-primary/30' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>{cat}</button>
                    ))}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
                        {loading ? (
                            Array.from({length: 10}).map((_,i) => <div key={i} className="aspect-square bg-white rounded-[2rem] animate-pulse"></div>)
                        ) : filteredItems.map(item => (
                            <div key={item.id} onClick={() => addToCart(item)} className="bg-white border border-gray-100 rounded-[2rem] p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden aspect-square">
                                <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-3 group-hover:scale-110 transition-transform">
                                    <Package className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-gray-900 line-clamp-2 leading-tight mb-1">{item.name}</h3>
                                <PriceTag amount={item.price} className="text-primary font-black" />
                                <div className={`absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full font-bold ${item.stock < 10 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>{item.stock}</div>
                            </div>
                        ))}
                    </div>
                    </div>
                </div>

                {/* Right Side: Cart */}
                <div className="w-[400px] bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden shrink-0 ring-1 ring-black/5">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-black text-xl flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> السلة ({cart.length})</h3>
                        <button onClick={clearCart} className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4"><Receipt className="w-20 h-20 opacity-20" /><p className="font-bold">ابدأ بإضافة الأصناف</p></div>
                        ) : cart.map((c) => (
                            <div key={c.item.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-bold text-gray-900 border">{c.qty}</div>
                                <div className="flex-1 text-right">
                                    <p className="font-bold text-sm text-gray-900 truncate">{c.item.name}</p>
                                    <p className="text-[10px] text-gray-500 font-bold">{c.item.price} SAR / وحدة</p>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <button onClick={() => updateQty(c.item.id, 1)} className="w-6 h-6 bg-white rounded-lg flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-xs font-bold shadow-sm">+</button>
                                    <button onClick={() => updateQty(c.item.id, -1)} className="w-6 h-6 bg-white rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors text-xs font-bold shadow-sm">{c.qty === 1 ? <Trash2 className="w-3 h-3" /> : '-'}</button>
                                </div>
                                <div className="font-black text-sm w-16 text-left">{(c.item.price * c.qty).toFixed(2)}</div>
                            </div>
                        ))}
                    </div>
                    <div className="p-6 bg-gray-900 text-white space-y-4 rounded-t-[2.5rem]">
                        <div className="space-y-2 text-sm font-medium opacity-80">
                            <div className="flex justify-between"><span>المجموع</span><span>{subtotal.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>الضريبة ({taxRate}%)</span><span>{taxAmount.toFixed(2)}</span></div>
                        </div>
                        <div className="flex justify-between text-3xl font-black border-t border-white/20 pt-4">
                            <span>الإجمالي</span>
                            <span>{total.toFixed(2)} <span className="text-xs align-top">SAR</span></span>
                        </div>
                        <Button onClick={handleCheckout} disabled={cart.length === 0 || isProcessing} className="w-full h-16 rounded-[1.8rem] bg-primary text-white font-black text-xl hover:bg-primary/90 shadow-xl shadow-primary/30 transition-transform active:scale-95">
                            {isProcessing ? <Loader2 className="animate-spin" /> : 'دفع وإصدار فاتورة'}
                        </Button>
                    </div>
                </div>
             </>
         ) : (
             // INVENTORY TAB
             <div className="flex-1 bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm overflow-hidden flex flex-col">
                 <div className="flex items-center gap-2 mb-4 text-gray-400 font-bold text-xs uppercase tracking-widest">
                     <Boxes className="w-4 h-4" /> إدارة المنتجات والمخزون
                 </div>
                 <div className="flex-1 overflow-auto">
                     <table className="w-full text-right">
                         <thead className="bg-gray-50 text-gray-500 font-bold text-xs sticky top-0">
                             <tr>
                                 <th className="p-4 rounded-r-xl">اسم المنتج</th>
                                 <th className="p-4">التصنيف</th>
                                 <th className="p-4">السعر</th>
                                 <th className="p-4">المخزون الحالي</th>
                                 <th className="p-4">الحالة</th>
                                 <th className="p-4 text-center rounded-l-xl">إجراءات</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                             {filteredItems.map(item => (
                                 <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                     <td className="p-4 font-bold text-gray-900">{item.name}</td>
                                     <td className="p-4 text-sm text-gray-500">{item.category}</td>
                                     <td className="p-4"><PriceTag amount={item.price} className="font-bold" /></td>
                                     <td className="p-4 font-black text-lg">{item.stock}</td>
                                     <td className="p-4">
                                         {item.stock < 10 ? 
                                            <span className="text-red-500 bg-red-50 px-2 py-1 rounded text-xs font-bold flex w-fit gap-1 items-center"><AlertTriangle className="w-3 h-3" /> منخفض</span> : 
                                            <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold">متوفر</span>
                                         }
                                     </td>
                                     <td className="p-4 text-center">
                                         <div className="flex justify-center gap-2">
                                             <button onClick={() => { setCurrentItem(item); setIsItemModalOpen(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit3 className="w-4 h-4" /></button>
                                             <button onClick={() => handleDeleteItem(item.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                                         </div>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             </div>
         )}
      </div>

      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title={currentItem.id ? 'تعديل المنتج' : 'إضافة منتج جديد'}>
         <div className="space-y-4 text-right">
            <Input label="اسم الصنف" value={currentItem.name || ''} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} className="h-12 rounded-xl" />
            <div className="grid grid-cols-2 gap-4">
               <Input label="السعر" type="number" value={currentItem.price || ''} onChange={e => setCurrentItem({...currentItem, price: Number(e.target.value)})} className="h-12 rounded-xl" />
               <Input label="الكمية (المخزون)" type="number" value={currentItem.stock || ''} onChange={e => setCurrentItem({...currentItem, stock: Number(e.target.value)})} className="h-12 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <Input label="الباركود (اختياري)" value={currentItem.barcode || ''} onChange={e => setCurrentItem({...currentItem, barcode: e.target.value})} className="h-12 rounded-xl" />
               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">التصنيف</label>
                  <select className="w-full h-12 border rounded-xl px-4 font-bold bg-white" value={currentItem.category} onChange={e => setCurrentItem({...currentItem, category: e.target.value})}>
                      {POS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
               </div>
            </div>
            <Button onClick={handleSaveItem} className="w-full h-14 rounded-xl font-black mt-4">حفظ البيانات</Button>
         </div>
      </Modal>

      <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="إتمام العملية">
         <div className="text-center space-y-6">
            <div className="bg-green-50 text-green-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in">
               <RefreshCcw className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black">إصدار الفاتورة</h3>
            <div id="receipt-print" className="bg-white border p-4 w-72 mx-auto text-center font-mono text-xs shadow-lg rounded-none">
               <div className="font-bold text-sm mb-2 border-b pb-2">{user.business_name || 'اسم المتجر'}</div>
               {user.pos_config?.receipt_header && <div className="mb-2">{user.pos_config.receipt_header}</div>}
               <div className="flex justify-between text-[10px] text-gray-500 mb-2">
                  <span>{new Date().toLocaleDateString()}</span>
                  <span>{receiptData?.orderId}</span>
               </div>
               <div className="border-t border-b border-dashed py-2 space-y-1 text-left">
                  {cart.map((c, i) => (
                     <div key={i} className="flex justify-between">
                        <span>{c.item.name} x{c.qty}</span>
                        <span>{(c.item.price * c.qty).toFixed(2)}</span>
                     </div>
                  ))}
               </div>
               <div className="pt-2 space-y-1 font-bold">
                  <div className="flex justify-between"><span>Total</span><span>{total.toFixed(2)}</span></div>
               </div>
               <div className="mt-4 pt-2 border-t text-[10px]">{user.pos_config?.receipt_footer}</div>
               {user.pos_config?.tax_id && <div className="text-[9px]">VAT: {user.pos_config.tax_id}</div>}
            </div>
            <div className="flex gap-3 pt-4">
               <Button variant="outline" onClick={() => { window.print(); confirmPayment(); }} className="flex-1 h-12 rounded-xl font-bold gap-2"><Printer className="w-4 h-4" /> طباعة وإنهاء</Button>
               <Button onClick={confirmPayment} className="flex-1 h-12 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white">تأكيد بدون طباعة</Button>
            </div>
         </div>
      </Modal>
      <style>{`@media print { body * { visibility: hidden; } #receipt-print, #receipt-print * { visibility: visible; } #receipt-print { position: absolute; left: 0; top: 0; width: 100%; border: none; shadow: none; } }`}</style>
    </div>
  );
};
