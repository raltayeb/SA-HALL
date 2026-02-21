
import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { UserProfile } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../context/ToastContext';
import { X, Receipt } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: UserProfile;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, onSuccess, user }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    invoice_number: '',
    expense_date: new Date().toISOString().split('T')[0],
    category: 'other',
    supplier_name: '',
    supplier_vat_number: '',
    description: '',
    amount: '',
    vat_amount: '',
    payment_method: 'cash',
    notes: ''
  });

  const { toast } = useToast();

  const categories = [
    { value: 'rent', label: 'إيجار' },
    { value: 'salaries', label: 'رواتب' },
    { value: 'utilities', label: 'مرافق' },
    { value: 'maintenance', label: 'صيانة' },
    { value: 'marketing', label: 'تسويق' },
    { value: 'supplies', label: 'مستلزمات' },
    { value: 'zakat', label: 'زكاة' },
    { value: 'tax', label: 'ضريبة' },
    { value: 'insurance', label: 'تأمين' },
    { value: 'other', label: 'أخرى' }
  ];

  const handleSubmit = async () => {
    if (!formData.supplier_name || !formData.amount) {
      toast({ title: 'تنبيه', description: 'يرجى تعبئة جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(formData.amount);
      const vatAmount = parseFloat(formData.vat_amount) || 0;
      const totalAmount = amount + vatAmount;

      const { error } = await supabase.from('expenses').insert([{
        vendor_id: user.id,
        invoice_number: formData.invoice_number,
        expense_date: formData.expense_date,
        category: formData.category,
        supplier_name: formData.supplier_name,
        supplier_vat_number: formData.supplier_vat_number,
        description: formData.description,
        amount,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        payment_method: formData.payment_method,
        notes: formData.notes
      }]);

      if (error) throw error;

      toast({ title: 'تم الإنشاء', description: 'تم تسجيل المصروف بنجاح', variant: 'success' });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center z-10">
          <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            تسجيل مصروف جديد
          </h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="رقم الفاتورة"
              value={formData.invoice_number}
              onChange={e => setFormData({...formData, invoice_number: e.target.value})}
              className="h-12 rounded-xl"
            />
            <Input
              label="تاريخ المصروف"
              type="date"
              value={formData.expense_date}
              onChange={e => setFormData({...formData, expense_date: e.target.value})}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500">التصنيف</label>
            <select
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              className="w-full h-12 border border-gray-200 rounded-xl px-4 outline-none focus:border-primary"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="اسم المورد *"
              value={formData.supplier_name}
              onChange={e => setFormData({...formData, supplier_name: e.target.value})}
              className="h-12 rounded-xl"
            />
            <Input
              label="الرقم الضريبي للمورد"
              value={formData.supplier_vat_number}
              onChange={e => setFormData({...formData, supplier_vat_number: e.target.value})}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="المبلغ *"
              type="number"
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: e.target.value})}
              className="h-12 rounded-xl"
              placeholder="0.00"
            />
            <Input
              label="ضريبة القيمة المضافة"
              type="number"
              value={formData.vat_amount}
              onChange={e => setFormData({...formData, vat_amount: e.target.value})}
              className="h-12 rounded-xl"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500">طريقة الدفع</label>
            <select
              value={formData.payment_method}
              onChange={e => setFormData({...formData, payment_method: e.target.value})}
              className="w-full h-12 border border-gray-200 rounded-xl px-4 outline-none focus:border-primary"
            >
              <option value="cash">نقدي</option>
              <option value="transfer">تحويل بنكي</option>
              <option value="card">بطاقة</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500">الوصف</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full h-24 border border-gray-200 rounded-xl p-3 outline-none focus:border-primary resize-none"
              placeholder="وصف المصروف..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500">ملاحظات</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              className="w-full h-20 border border-gray-200 rounded-xl p-3 outline-none focus:border-primary resize-none"
              placeholder="ملاحظات إضافية..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 h-14 rounded-2xl font-black"
            >
              {loading ? 'جاري التسجيل...' : 'تسجيل المصروف'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
