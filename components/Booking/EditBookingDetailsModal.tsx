
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Booking } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Loader2, Save, Calculator, DollarSign, User, Phone, FileText } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { PriceTag } from '../ui/PriceTag';

interface EditBookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  onSuccess: () => void;
}

export const EditBookingDetailsModal: React.FC<EditBookingDetailsModalProps> = ({ isOpen, onClose, booking, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    status: booking.status,
    payment_status: booking.payment_status || 'unpaid',
    total_amount: booking.total_amount,
    paid_amount: booking.paid_amount || 0,
    start_time: booking.start_time || '',
    end_time: booking.end_time || '',
    notes: booking.notes || '',
    guest_name: booking.guest_name || '',
    guest_phone: booking.guest_phone || ''
  });

  const { toast } = useToast();

  useEffect(() => {
    if(isOpen) {
        setFormData({
            status: booking.status,
            payment_status: booking.payment_status || 'unpaid',
            total_amount: booking.total_amount,
            paid_amount: booking.paid_amount || 0,
            start_time: booking.start_time || '',
            end_time: booking.end_time || '',
            notes: booking.notes || '',
            guest_name: booking.guest_name || '',
            guest_phone: booking.guest_phone || ''
        });
    }
  }, [isOpen, booking]);

  const remainingAmount = Math.max(0, formData.total_amount - formData.paid_amount);

  const handleSave = async () => {
    setLoading(true);
    try {
        // Auto update payment status based on amounts
        let newPaymentStatus = formData.payment_status;
        if (formData.paid_amount >= formData.total_amount && formData.total_amount > 0) {
            newPaymentStatus = 'paid';
        } else if (formData.paid_amount > 0) {
            newPaymentStatus = 'partial';
        } else {
            newPaymentStatus = 'unpaid';
        }

        const { error } = await supabase
            .from('bookings')
            .update({
                status: formData.status,
                payment_status: newPaymentStatus,
                paid_amount: formData.paid_amount,
                start_time: formData.start_time,
                end_time: formData.end_time,
                notes: formData.notes,
                guest_name: formData.guest_name,
                guest_phone: formData.guest_phone
            })
            .eq('id', booking.id);

        if (error) throw error;

        toast({ title: 'تم التحديث', description: 'تم حفظ تفاصيل الحجز بنجاح.', variant: 'success' });
        onSuccess();
        onClose();
    } catch (err: any) {
        toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تعديل تفاصيل الحجز">
        <div className="space-y-6 text-right">
            
            {/* Status Section */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">حالة الحجز</label>
                    <select 
                        className="w-full h-11 border rounded-xl px-4 text-sm font-bold bg-white"
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value as any})}
                    >
                        <option value="pending">قيد الانتظار</option>
                        <option value="confirmed">مؤكد</option>
                        <option value="cancelled">ملغي</option>
                        <option value="completed">مكتمل</option>
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Input label="وقت الدخول" type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                    <Input label="وقت الخروج" type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                </div>
            </div>

            {/* Guest Details Section (Improved Look) */}
            <div className="bg-white border border-gray-200 p-4 rounded-2xl space-y-4 shadow-sm">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-xs border-b pb-2 mb-2">
                    <User className="w-4 h-4 text-primary" /> بطاقة العميل
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Input 
                        label="اسم العميل" 
                        value={formData.guest_name} 
                        onChange={e => setFormData({...formData, guest_name: e.target.value})}
                        className="bg-gray-50 border-gray-100 focus:bg-white transition-colors font-bold"
                    />
                    <Input 
                        label="رقم الجوال" 
                        value={formData.guest_phone} 
                        onChange={e => setFormData({...formData, guest_phone: e.target.value})}
                        className="bg-gray-50 border-gray-100 focus:bg-white transition-colors font-bold"
                    />
                </div>
            </div>

            {/* Financials Section */}
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-xs">
                    <Calculator className="w-4 h-4" /> الحسابات المالية
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500">إجمالي المبلغ</label>
                        <div className="h-11 bg-white border border-gray-200 rounded-xl flex items-center px-4 font-black">
                            <PriceTag amount={formData.total_amount} />
                        </div>
                    </div>
                    <Input 
                        label="المبلغ المدفوع (المقدم)" 
                        type="number" 
                        value={formData.paid_amount} 
                        onChange={e => setFormData({...formData, paid_amount: Number(e.target.value)})}
                        className="bg-white border-blue-200 focus:border-blue-400 font-bold"
                    />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                    <span className="text-xs font-bold text-blue-800">المبلغ المتبقي:</span>
                    <PriceTag amount={remainingAmount} className={`text-lg font-black ${remainingAmount > 0 ? 'text-red-500' : 'text-green-600'}`} />
                </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><FileText className="w-3 h-3" /> ملاحظات إضافية</label>
                <textarea 
                    className="w-full h-20 border rounded-xl p-3 text-sm font-bold bg-white resize-none focus:ring-1 focus:ring-primary/20 outline-none"
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    placeholder="ملاحظات حول الحجز..."
                />
            </div>

            <Button onClick={handleSave} disabled={loading} className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20 gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                حفظ التعديلات
            </Button>
        </div>
    </Modal>
  );
};
