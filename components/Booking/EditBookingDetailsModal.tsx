
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Booking, PaymentLog } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PriceTag } from '../ui/PriceTag';
import { 
  Loader2, Save, User, Ticket, CheckCircle2, AlertCircle, History, Building2, 
  MapPin, Phone, FileText, CreditCard, Coins
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
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [loading, setLoading] = useState(false);
  
  // Data for editing
  const [formData, setFormData] = useState({
    status: booking.status,
    notes: booking.notes || '',
    guest_name: booking.guest_name || booking.client?.full_name || '',
    guest_phone: booking.guest_phone || booking.client?.phone_number || ''
  });

  // Data for History
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
      if (isOpen && activeTab === 'history') {
          const fetchLogs = async () => {
              setLoadingLogs(true);
              const { data } = await supabase.from('payment_logs').select('*').eq('booking_id', booking.id).order('created_at', { ascending: false });
              setLogs(data as PaymentLog[] || []);
              setLoadingLogs(false);
          };
          fetchLogs();
      }
  }, [isOpen, activeTab, booking.id]);

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
    <Modal isOpen={isOpen} onClose={onClose} title="إدارة الحجز" className="max-w-2xl">
        <div className="text-right font-tajawal">
            
            {/* Header Ticket */}
            <div className="bg-gray-900 text-white p-6 rounded-t-3xl rounded-b-xl relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">رقم الحجز</p>
                        <h2 className="text-3xl font-black font-mono tracking-wider">#{booking.id.slice(0, 6).toUpperCase()}</h2>
                    </div>
                    <div className="text-left">
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">تاريخ المناسبة</p>
                        <h3 className="text-xl font-bold">{format(new Date(booking.booking_date), 'dd MMM yyyy', { locale: arSA })}</h3>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 mb-6">
                <button onClick={() => setActiveTab('details')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'details' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600'}`}>تفاصيل الحجز</button>
                <button onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'history' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600'}`}>السجل المالي والعمليات</button>
            </div>

            {activeTab === 'details' ? (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="grid md:grid-cols-2 gap-6">
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
                                    <option value="on_hold">حجز مؤقت</option>
                                    <option value="blocked">محجوب (خاص)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><FileText className="w-3 h-3" /> ملاحظات إدارية</label>
                        <textarea 
                            className="w-full h-24 border border-gray-200 rounded-2xl p-4 text-sm font-bold bg-gray-50 resize-none focus:bg-white focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                            value={formData.notes}
                            onChange={e => setFormData({...formData, notes: e.target.value})}
                            placeholder="ملاحظات خاصة بالحجز..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <Button variant="outline" onClick={onClose} className="flex-1 h-12 rounded-xl font-bold border-gray-200">إلغاء</Button>
                        <Button onClick={handleSave} disabled={loading} className="flex-[2] h-12 rounded-xl font-black shadow-lg shadow-primary/20 gap-2">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            حفظ التغييرات
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-left-4 h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    
                    {/* Financial Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-center">
                            <span className="text-[10px] font-bold text-blue-600 block mb-1">الإجمالي</span>
                            <PriceTag amount={booking.total_amount} className="justify-center text-lg text-blue-800" />
                        </div>
                        <div className="bg-green-50 border border-green-100 p-4 rounded-2xl text-center">
                            <span className="text-[10px] font-bold text-green-600 block mb-1">المدفوع</span>
                            <PriceTag amount={booking.paid_amount || 0} className="justify-center text-lg text-green-800" />
                        </div>
                        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-center">
                            <span className="text-[10px] font-bold text-red-600 block mb-1">المتبقي</span>
                            <PriceTag amount={Math.max(0, booking.total_amount - (booking.paid_amount || 0))} className="justify-center text-lg text-red-800" />
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="relative border-r-2 border-gray-100 mr-3 space-y-8">
                        {loadingLogs ? (
                            <div className="pr-6 py-4 flex items-center gap-2 text-gray-400 font-bold"><Loader2 className="w-4 h-4 animate-spin" /> جاري تحميل السجل...</div>
                        ) : logs.length === 0 ? (
                            <div className="pr-6 py-4 text-gray-400 font-bold text-sm">لا توجد عمليات دفع مسجلة.</div>
                        ) : logs.map((log) => (
                            <div key={log.id} className="relative pr-8">
                                <div className="absolute top-1.5 -right-[9px] w-4 h-4 bg-green-500 rounded-full ring-4 ring-white flex items-center justify-center">
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                </div>
                                <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-black text-gray-900 text-sm flex items-center gap-2">
                                                {log.payment_method === 'card' ? <CreditCard className="w-4 h-4 text-purple-500" /> : <Coins className="w-4 h-4 text-yellow-500" />}
                                                {log.payment_method === 'card' ? 'دفع إلكتروني' : log.payment_method === 'transfer' ? 'تحويل بنكي' : 'نقدي'}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1 font-bold">{format(new Date(log.created_at), 'dd MMMM yyyy - hh:mm a', { locale: arSA })}</p>
                                        </div>
                                        <PriceTag amount={log.amount} className="text-green-600 font-black" />
                                    </div>
                                    {log.notes && (
                                        <div className="bg-gray-50 p-2 rounded-lg text-xs text-gray-600 font-medium mt-2">
                                            {log.notes}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        
                        {/* Creation Event */}
                        <div className="relative pr-8">
                            <div className="absolute top-1.5 -right-[9px] w-4 h-4 bg-gray-300 rounded-full ring-4 ring-white"></div>
                            <div className="text-gray-400 text-xs font-bold pt-1">
                                تم إنشاء الحجز بتاريخ {format(new Date(booking.created_at || new Date()), 'dd/MM/yyyy')}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </Modal>
  );
};
