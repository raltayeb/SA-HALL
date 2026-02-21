
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { UserProfile, Invoice, Booking } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../context/ToastContext';
import { X, Plus, Trash2, Receipt } from 'lucide-react';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user?: UserProfile;
  booking?: Booking | null;
}

interface InvoiceItem {
  name: string;
  qty: number;
  unit_price: number;
  total: number;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, onSuccess, user, booking }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_vat_number: '',
    notes: ''
  });
  const [items, setItems] = useState<InvoiceItem[]>([
    { name: '', qty: 1, unit_price: 0, total: 0 }
  ]);

  const { toast } = useToast();

  // Pre-fill from booking if provided
  useEffect(() => {
    if (booking) {
      setFormData({
        customer_name: booking.guest_name || '',
        customer_phone: booking.guest_phone || '',
        customer_email: booking.guest_email || '',
        customer_vat_number: '',
        notes: booking.notes || ''
      });
      
      // Add booking items
      if (booking.items && booking.items.length > 0) {
        setItems(booking.items.map(item => ({
          name: item.name,
          qty: item.qty,
          unit_price: item.price,
          total: item.price * item.qty
        })));
      }
    }
  }, [booking]);

  const addItem = () => {
    setItems([...items, { name: '', qty: 1, unit_price: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'qty' || field === 'unit_price') {
      const qty = field === 'qty' ? value : newItems[index].qty;
      const unit_price = field === 'unit_price' ? value : newItems[index].unit_price;
      newItems[index].total = qty * unit_price;
    }
    
    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const vat = subtotal * 0.15;
    const total = subtotal + vat;
    return { subtotal, vat, total };
  };

  const handleSubmit = async () => {
    if (!formData.customer_name || items.length === 0 || !items[0].name) {
      toast({ title: 'تنبيه', description: 'يرجى تعبئة جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { subtotal, vat, total } = calculateTotals();
      const invoiceNumber = `INV-${Date.now()}`;

      const invoiceData: any = {
        invoice_number: invoiceNumber,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_email: formData.customer_email,
        customer_vat_number: formData.customer_vat_number,
        items: items,
        subtotal,
        vat_rate: 15,
        vat_amount: vat,
        total_amount: total,
        payment_status: 'unpaid',
        notes: formData.notes
      };

      // Add vendor_id if creating from accounting (not from booking)
      if (user) {
        invoiceData.vendor_id = user.id;
      }

      // Add booking_id if creating from booking
      if (booking) {
        invoiceData.booking_id = booking.id;
        invoiceData.payment_status = booking.payment_status || 'unpaid';
      }

      const { error } = await supabase.from('invoices').insert([invoiceData]);

      if (error) throw error;

      toast({ title: 'تم الإنشاء', description: 'تم إنشاء الفاتورة بنجاح', variant: 'success' });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, vat, total } = calculateTotals();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-[2rem] w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center z-10">
          <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            إنشاء فاتورة جديدة
          </h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-black text-primary">بيانات العميل</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="اسم العميل *"
                value={formData.customer_name}
                onChange={e => setFormData({...formData, customer_name: e.target.value})}
                className="h-12 rounded-xl"
              />
              <Input
                label="رقم الجوال"
                value={formData.customer_phone}
                onChange={e => setFormData({...formData, customer_phone: e.target.value})}
                className="h-12 rounded-xl"
              />
              <Input
                label="البريد الإلكتروني"
                type="email"
                value={formData.customer_email}
                onChange={e => setFormData({...formData, customer_email: e.target.value})}
                className="h-12 rounded-xl"
              />
              <Input
                label="الرقم الضريبي"
                value={formData.customer_vat_number}
                onChange={e => setFormData({...formData, customer_vat_number: e.target.value})}
                className="h-12 rounded-xl"
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-black text-primary">العناصر</h4>
              <Button onClick={addItem} variant="outline" className="h-10 gap-2">
                <Plus className="w-4 h-4" /> إضافة عنصر
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <Input
                      placeholder="اسم العنصر"
                      value={item.name}
                      onChange={e => updateItem(index, 'name', e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      placeholder="الكمية"
                      value={item.qty}
                      onChange={e => updateItem(index, 'qty', parseInt(e.target.value) || 0)}
                      className="h-10"
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      placeholder="السعر"
                      value={item.unit_price}
                      onChange={e => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="h-10"
                    />
                  </div>
                  <div className="w-24 text-left">
                    <p className="text-sm font-bold text-gray-500 mt-2">{item.total} ر.س</p>
                  </div>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(index)}
                      className="w-10 h-10 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-6 space-y-2">
            <div className="flex justify-between text-sm font-bold text-gray-600">
              <span>المجموع الفرعي</span>
              <span>{subtotal.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-600">
              <span>ضريبة القيمة المضافة (15%)</span>
              <span>{vat.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between text-lg font-black text-primary">
              <span>الإجمالي</span>
              <span>{total.toFixed(2)} ر.س</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-500">ملاحظات</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              className="w-full h-24 border border-gray-200 rounded-xl p-3 outline-none focus:border-primary resize-none"
              placeholder="أضف ملاحظات إضافية..."
            />
          </div>

          {/* Action */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 h-14 rounded-2xl font-black"
            >
              {loading ? 'جاري الإنشاء...' : 'إنشاء الفاتورة'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
