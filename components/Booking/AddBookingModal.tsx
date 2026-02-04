
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { UserProfile, Hall, Booking } from '../../types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Loader2, Calendar, Clock, User, DollarSign, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface AddBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;
  onSuccess: () => void;
}

export const AddBookingModal: React.FC<AddBookingModalProps> = ({ isOpen, onClose, vendorId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [halls, setHalls] = useState<Hall[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<Booking>>({
    booking_date: new Date().toISOString().split('T')[0],
    start_time: '16:00',
    end_time: '23:00',
    payment_status: 'unpaid',
    status: 'confirmed',
    total_amount: 0,
    paid_amount: 0,
    notes: '' 
  });

  // Additional state for manual guest entry
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchHalls = async () => {
        const { data } = await supabase.from('halls').select('*').eq('vendor_id', vendorId);
        setHalls(data || []);
        if (data && data.length > 0) {
            setFormData(prev => ({ 
              ...prev, 
              hall_id: data[0].id, 
              total_amount: data[0].price_per_night,
              paid_amount: 0
            }));
        }
      };
      fetchHalls();
    }
  }, [isOpen, vendorId]);

  const handleSubmit = async () => {
    // 1. Basic Validation
    if (!formData.hall_id || !guestName) {
        toast({ title: 'نقص في البيانات', description: 'يرجى اختيار القاعة واسم العميل.', variant: 'destructive' });
        return;
    }

    // 2. Date Validation (Cannot be in the past)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(formData.booking_date!);
    selectedDate.setHours(0, 0, 0, 0); // Normalize time part

    if (selectedDate < today) {
        toast({ title: 'تاريخ غير صالح', description: 'لا يمكن اختيار تاريخ في الماضي.', variant: 'destructive' });
        return;
    }

    // 3. Time Validation (Start must be before End)
    if (formData.start_time && formData.end_time) {
        if (formData.start_time >= formData.end_time) {
            toast({ title: 'توقيت غير منطقي', description: 'يجب أن يكون وقت الدخول قبل وقت الخروج.', variant: 'destructive' });
            return;
        }
    }

    setLoading(true);
    try {
        // Calculate Paid Amount Logic
        let finalPaidAmount = 0;
        if (formData.payment_status === 'paid') {
            finalPaidAmount = formData.total_amount || 0;
        } else if (formData.payment_status === 'partial') {
            finalPaidAmount = Number(formData.paid_amount) || 0;
            // Validate Partial Amount
            if (finalPaidAmount <= 0) {
                throw new Error('يرجى إدخال مبلغ المقدم بشكل صحيح.');
            }
            if (finalPaidAmount >= (formData.total_amount || 0)) {
                // If user entered full amount but selected partial, switch to paid
                formData.payment_status = 'paid'; 
            }
        } else {
            finalPaidAmount = 0;
        }

        const payload = {
            ...formData,
            paid_amount: finalPaidAmount,
            vendor_id: vendorId,
            user_id: vendorId, // Assign to vendor self if manual guest
            vat_amount: (formData.total_amount || 0) * 0.15,
            guest_name: guestName,
            guest_phone: guestPhone,
            notes: formData.notes // Keep notes separate from guest details
        };

        const { error } = await supabase.from('bookings').insert([payload]);
        if (error) throw error;

        toast({ title: 'تمت الإضافة', description: 'تم إنشاء الحجز بنجاح', variant: 'success' });
        onSuccess();
        onClose();
        // Reset form
        setGuestName('');
        setGuestPhone('');
        setFormData(prev => ({ ...prev, paid_amount: 0 }));
    } catch (err: any) {
        toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة حجز جديد">
        <div className="space-y-4 text-right">
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">القاعة / الباقة</label>
                <select 
                    className="w-full h-11 border rounded-xl px-4 text-sm font-bold bg-white"
                    value={formData.hall_id}
                    onChange={e => {
                        const hall = halls.find(h => h.id === e.target.value);
                        setFormData({...formData, hall_id: e.target.value, total_amount: hall?.price_per_night || 0});
                    }}
                >
                    {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Input label="اسم العميل" value={guestName} onChange={e => setGuestName(e.target.value)} />
                <Input label="رقم الجوال" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Input type="date" label="تاريخ الحجز" value={formData.booking_date} onChange={e => setFormData({...formData, booking_date: e.target.value})} />
                <Input type="number" label="المبلغ الإجمالي" value={formData.total_amount} onChange={e => setFormData({...formData, total_amount: Number(e.target.value)})} />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Input type="time" label="وقت الدخول" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                <Input type="time" label="وقت الخروج" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">حالة الدفع</label>
                    <select 
                        className="w-full h-11 border rounded-xl px-4 text-sm font-bold bg-white"
                        value={formData.payment_status}
                        onChange={e => setFormData({...formData, payment_status: e.target.value as any})}
                    >
                        <option value="paid">مدفوع بالكامل</option>
                        <option value="partial">مدفوع جزئياً (مقدم)</option>
                        <option value="unpaid">غير مدفوع (أجل)</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">حالة الحجز</label>
                    <select 
                        className="w-full h-11 border rounded-xl px-4 text-sm font-bold bg-white"
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value as any})}
                    >
                        <option value="confirmed">مؤكد</option>
                        <option value="pending">قيد الانتظار</option>
                    </select>
                </div>
            </div>

            {/* Conditional Input for Partial Payment */}
            {formData.payment_status === 'partial' && (
                <div className="animate-in slide-in-from-top-2 fade-in">
                    <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-yellow-700">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>تحديد قيمة العربون / المقدم</span>
                        </div>
                        <Input 
                            type="number" 
                            label="المبلغ المدفوع (مقدم)" 
                            value={formData.paid_amount} 
                            onChange={e => setFormData({...formData, paid_amount: Number(e.target.value)})}
                            className="bg-white border-yellow-200 focus:border-yellow-400"
                        />
                        <p className="text-[10px] text-gray-400 font-bold text-left px-1">
                            المتبقي: {Math.max(0, (formData.total_amount || 0) - (formData.paid_amount || 0))} ر.س
                        </p>
                    </div>
                </div>
            )}

            <Button onClick={handleSubmit} disabled={loading} className="w-full h-12 rounded-xl font-bold mt-4 shadow-lg shadow-primary/20">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ الحجز'}
            </Button>
        </div>
    </Modal>
  );
};
