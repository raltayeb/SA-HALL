
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Booking, PaymentLog } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PriceTag } from '../ui/PriceTag';
import { Badge } from '../ui/Badge';
import { 
  Calendar, Clock, MapPin, FileText, CheckCircle2, 
  CreditCard, User, Phone, Building2, AlertCircle, History
} from 'lucide-react';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface GuestBookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  onOpenInvoice: () => void;
}

export const GuestBookingDetailsModal: React.FC<GuestBookingDetailsModalProps> = ({ 
  isOpen, onClose, booking, onOpenInvoice 
}) => {
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && booking.id) {
      const fetchLogs = async () => {
        setLoading(true);
        const { data } = await supabase
          .from('payment_logs')
          .select('*')
          .eq('booking_id', booking.id)
          .order('created_at', { ascending: false });
        setLogs(data as PaymentLog[] || []);
        setLoading(false);
      };
      fetchLogs();
    }
  }, [isOpen, booking.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-50 text-green-700 border-green-200';
      case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'مؤكد';
      case 'pending': return 'قيد المراجعة';
      case 'cancelled': return 'ملغي';
      case 'completed': return 'مكتمل';
      default: return status;
    }
  };

  const remainingAmount = Math.max(0, booking.total_amount - (booking.paid_amount || 0));
  const progressPercent = Math.min(100, ((booking.paid_amount || 0) / booking.total_amount) * 100);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تفاصيل الحجز" className="max-w-4xl">
      <div className="space-y-8 text-right font-tajawal pb-4">
        
        {/* Header Status */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
           <div>
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                 {booking.halls?.name || booking.services?.name}
              </h3>
              <p className="text-sm font-bold text-gray-500 mt-1 flex items-center gap-1">
                 <Building2 className="w-4 h-4" /> مقدم الخدمة: {booking.vendor?.business_name || 'غير محدد'}
              </p>
           </div>
           <div className={`px-4 py-2 rounded-xl border font-black text-sm flex items-center gap-2 ${getStatusColor(booking.status)}`}>
              {booking.status === 'confirmed' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>حالة الطلب: {getStatusLabel(booking.status)}</span>
           </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
            
            {/* Right Column: Dates & Info */}
            <div className="space-y-6">
                <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
                    <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">بيانات الموعد</h4>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><Calendar className="w-5 h-5" /></div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400">تاريخ الحجز</p>
                                <p className="text-sm font-black text-gray-900">{format(new Date(booking.booking_date), 'EEEE, d MMMM yyyy', { locale: arSA })}</p>
                            </div>
                        </div>
                        {booking.check_out_date && (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Calendar className="w-5 h-5" /></div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400">تاريخ المغادرة</p>
                                    <p className="text-sm font-black text-gray-900">{format(new Date(booking.check_out_date), 'EEEE, d MMMM yyyy', { locale: arSA })}</p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><MapPin className="w-5 h-5" /></div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400">الموقع</p>
                                <p className="text-sm font-black text-gray-900">{booking.halls?.city || 'الرياض'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
                    <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">بياناتك المسجلة</h4>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                            <User className="w-4 h-4 text-gray-400" /> {booking.guest_name || booking.client?.full_name}
                        </div>
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                            <Phone className="w-4 h-4 text-gray-400" /> {booking.guest_phone || booking.client?.phone_number}
                        </div>
                    </div>
                </div>
            </div>

            {/* Left Column: Financials & Logs */}
            <div className="space-y-6">
                <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-6">
                    <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">الملخص المالي</h4>
                    
                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-green-600">المدفوع: {(booking.paid_amount || 0).toLocaleString()} ر.س</span>
                            <span className="text-gray-400">الإجمالي: {booking.total_amount.toLocaleString()} ر.س</span>
                        </div>
                        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        {remainingAmount > 0 && (
                            <p className="text-[10px] font-bold text-red-500 text-left pt-1">المتبقي للدفع: {remainingAmount.toLocaleString()} ر.س</p>
                        )}
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500">حالة الدفع</span>
                        <Badge variant={booking.payment_status === 'paid' ? 'success' : 'warning'}>
                            {booking.payment_status === 'paid' ? 'خالص' : booking.payment_status === 'partial' ? 'مدفوع جزئياً' : 'غير مدفوع'}
                        </Badge>
                    </div>

                    <Button onClick={onOpenInvoice} variant="outline" className="w-full h-12 rounded-xl font-bold gap-2 border-primary/20 text-primary hover:bg-primary/5">
                        <FileText className="w-4 h-4" /> عرض الفاتورة الإلكترونية
                    </Button>
                </div>

                <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
                    <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 flex items-center gap-2">
                        <History className="w-4 h-4" /> سجل الدفعات
                    </h4>
                    <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                        {loading ? (
                            <p className="text-xs text-center text-gray-400">جاري التحميل...</p>
                        ) : logs.length === 0 ? (
                            <div className="text-center py-6">
                                <p className="text-xs font-bold text-gray-300">لا توجد دفعات مسجلة حتى الآن</p>
                            </div>
                        ) : (
                            logs.map((log) => (
                                <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div>
                                        <p className="text-xs font-black text-gray-900 flex items-center gap-1">
                                            {log.payment_method === 'card' ? 'دفع إلكتروني' : log.payment_method === 'transfer' ? 'تحويل بنكي' : 'نقدي'}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}</p>
                                    </div>
                                    <PriceTag amount={log.amount} className="text-sm font-black text-green-600" />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Included Items */}
        {booking.items && booking.items.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-100">
                <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">الخدمات والإضافات</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {booking.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                            <span className="text-xs font-bold text-gray-700">{item.name} <span className="text-gray-400 text-[10px]">x{item.qty}</span></span>
                            <span className="text-xs font-black text-primary">{item.price} ر.س</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </Modal>
  );
};
