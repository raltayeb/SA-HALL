
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Booking } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PriceTag } from '../ui/PriceTag';
import { 
  Loader2, Save, User, CalendarCheck, CheckCircle2, Clock, 
  MapPin, Phone, Mail, FileText, Ticket
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

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
    notes: booking.notes || '',
    guest_name: booking.guest_name || booking.client?.full_name || '',
    guest_phone: booking.guest_phone || booking.client?.phone_number || ''
  });

  const { toast } = useToast();

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
        toast({ title: 'تم التحديث', variant: 'success' });
        onSuccess();
        onClose();
    } catch (err: any) {
        toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  const assetName = booking.halls?.name || booking.chalets?.name || booking.services?.name;
  const assetLocation = booking.halls?.city || booking.chalets?.city;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تفاصيل الحجز" className="max-w-2xl">
        <div className="space-y-6 text-right font-tajawal">
            
            {/* Ticket Header Style */}
            <div className="bg-gray-900 text-white p-6 rounded-t-3xl rounded-b-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">رقم الحجز</p>
                        <h2 className="text-3xl font-black font-mono">#{booking.id.slice(0, 6).toUpperCase()}</h2>
                    </div>
                    <div className="text-left">
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">تاريخ المناسبة</p>
                        <h3 className="text-xl font-bold">{format(new Date(booking.booking_date), 'dd MMM yyyy', { locale: arSA })}</h3>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 px-2">
                <div className="space-y-4">
                    <h4 className="text-xs font-black text-gray-400 uppercase border-b border-gray-100 pb-2">بيانات العميل</h4>
                    <div className="space-y-3">
                        <Input 
                            label="اسم العميل" 
                            value={formData.guest_name} 
                            onChange={e => setFormData({...formData, guest_name: e.target.value})}
                            className="h-12 rounded-xl font-bold bg-gray-50 focus:bg-white"
                            icon={<User className="w-4 h-4" />}
                        />
                        <Input 
                            label="رقم التواصل" 
                            value={formData.guest_phone} 
                            onChange={e => setFormData({...formData, guest_phone: e.target.value})}
                            className="h-12 rounded-xl font-bold bg-gray-50 focus:bg-white"
                            icon={<Phone className="w-4 h-4" />}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-xs font-black text-gray-400 uppercase border-b border-gray-100 pb-2">تفاصيل الخدمة</h4>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                        <p className="font-black text-gray-900 text-sm flex items-center gap-2"><Ticket className="w-4 h-4 text-primary" /> {assetName}</p>
                        {assetLocation && <p className="text-xs text-gray-500 font-bold flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {assetLocation}</p>}
                        <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500">الإجمالي</span>
                            <PriceTag amount={booking.total_amount} className="text-primary font-black" />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">حالة الحجز</label>
                        <select 
                            className="w-full h-12 bg-white border border-gray-200 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10"
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
            </div>

            <div className="space-y-2 px-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><FileText className="w-3 h-3" /> ملاحظات إدارية</label>
                <textarea 
                    className="w-full h-24 border border-gray-200 rounded-2xl p-4 text-sm font-bold bg-gray-50 resize-none focus:bg-white focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    placeholder="ملاحظات خاصة بالحجز..."
                />
            </div>

            <div className="flex gap-3 pt-6 border-t border-gray-100">
                <Button variant="outline" onClick={onClose} className="flex-1 h-12 rounded-xl font-bold border-gray-200">إلغاء</Button>
                <Button onClick={handleSave} disabled={loading} className="flex-[2] h-12 rounded-xl font-black shadow-lg shadow-primary/20 gap-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    حفظ التغييرات
                </Button>
            </div>
        </div>
    </Modal>
  );
};
