
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Booking } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Loader2, Save, Calculator, User, CalendarCheck, CheckCircle2, Clock, PieChart, Lock } from 'lucide-react';
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
            notes: booking.notes || '',
            guest_name: booking.guest_name || '',
            guest_phone: booking.guest_phone || ''
        });
    }
  }, [isOpen, booking]);

  const remainingAmount = Math.max(0, formData.total_amount - formData.paid_amount);

  const getStatusStyles = () => {
    switch (formData.payment_status) {
        case 'paid':
            return { bg: 'bg-emerald-500', lightBg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', icon: <CheckCircle2 className="w-5 h-5 text-white" />, label: 'مدفوع بالكامل' };
        case 'partial':
            return { bg: 'bg-amber-500', lightBg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', icon: <PieChart className="w-5 h-5 text-white" />, label: 'مدفوع جزئياً' };
        default:
            return { bg: 'bg-gray-500', lightBg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: <Clock className="w-5 h-5 text-white" />, label: 'آجل / غير مدفوع' };
    }
  };

  const statusStyle = getStatusStyles();

  const handleSave = async () => {
    setLoading(true);
    try {
        const { error } = await supabase
            .from('bookings')
            .update({
                status: formData.status,
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
    <Modal isOpen={isOpen} onClose={onClose} title="تعديل تفاصيل الحجز" className="max-w-3xl">
        <div className="space-y-6 text-right">
            
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    {/* Status Section */}
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4">
                        <div className="flex items-center gap-2 text-gray-800 font-bold text-xs border-b border-gray-200 pb-2 mb-2">
                            <CalendarCheck className="w-4 h-4 text-primary" /> حالة الحجز
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">حالة الحجز</label>
                            <select 
                                className="w-full h-11 border rounded-xl px-4 text-sm font-bold bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                value={formData.status}
                                onChange={e => setFormData({...formData, status: e.target.value as any})}
                            >
                                <option value="pending">قيد الانتظار</option>
                                <option value="confirmed">مؤكد</option>
                                <option value="cancelled">ملغي</option>
                                <option value="completed">مكتمل</option>
                            </select>
                        </div>
                    </div>

                    {/* Guest Details Section */}
                    <div className="bg-white border border-gray-200 p-5 rounded-2xl space-y-4 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-800 font-bold text-xs border-b border-gray-100 pb-2 mb-2">
                            <User className="w-4 h-4 text-primary" /> بطاقة العميل
                        </div>
                        <div className="space-y-4">
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
                </div>

                <div className="space-y-6">
                    {/* Enhanced Financials Section (READ ONLY) */}
                    <div className={`p-5 rounded-2xl border space-y-5 ${statusStyle.lightBg} ${statusStyle.border} relative overflow-hidden`}>
                        <div className="flex items-center justify-between border-b border-gray-200/50 pb-4">
                            <div className="flex items-center gap-2 text-primary font-bold text-xs">
                                <Calculator className="w-4 h-4" /> الحسابات المالية (للعرض فقط)
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm ${statusStyle.bg}`}>
                                {statusStyle.icon}
                                <span className="text-white text-xs font-black">{statusStyle.label}</span>
                            </div>
                        </div>
                        
                        <div className="space-y-4 opacity-80 pointer-events-none">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500">إجمالي المبلغ</label>
                                <div className="h-11 bg-white border border-gray-200 rounded-xl flex items-center px-4 font-black">
                                    <PriceTag amount={formData.total_amount} />
                                </div>
                            </div>
                            <Input 
                                label="المدفوع حتى الآن" 
                                type="number" 
                                value={formData.paid_amount} 
                                readOnly
                                className="bg-white border-gray-200 font-bold text-gray-500"
                            />
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-gray-200/50">
                            <span className="text-xs font-bold text-gray-600">المبلغ المتبقي للتحصيل:</span>
                            <PriceTag amount={remainingAmount} className={`text-xl font-black ${remainingAmount > 0 ? 'text-red-500' : 'text-green-600'}`} />
                        </div>

                        <div className="bg-white/80 p-2 text-center text-[10px] font-bold text-primary border border-primary/20 rounded-xl flex items-center justify-center gap-2">
                            <Lock className="w-3 h-3" />
                            <span>التعديلات المالية تتم من قسم "المالية" فقط</span>
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"> ملاحظات إضافية</label>
                        <textarea 
                            className="w-full h-[100px] border rounded-xl p-3 text-sm font-bold bg-white resize-none focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            value={formData.notes}
                            onChange={e => setFormData({...formData, notes: e.target.value})}
                            placeholder="ملاحظات حول الحجز..."
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="outline" onClick={onClose} className="rounded-xl h-12 px-6 font-bold">إلغاء</Button>
                <Button onClick={handleSave} disabled={loading} className="rounded-xl h-12 px-8 font-black shadow-xl shadow-primary/20 gap-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    حفظ التغييرات
                </Button>
            </div>
        </div>
    </Modal>
  );
};
