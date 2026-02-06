
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Hall, Booking, VendorClient } from '../../types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Loader2, AlertCircle, UserCheck, Plus } from 'lucide-react';
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
  const [clients, setClients] = useState<VendorClient[]>([]); // Clients list
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

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Fetch Data on Open
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        // 1. Fetch Halls
        const { data: hallsData } = await supabase.from('halls').select('*').eq('vendor_id', vendorId);
        setHalls(hallsData || []);
        if (hallsData && hallsData.length > 0) {
            setFormData(prev => ({ 
              ...prev, 
              hall_id: hallsData[0].id, 
              total_amount: hallsData[0].price_per_night,
              paid_amount: 0
            }));
        }

        // 2. Fetch Clients
        const { data: clientsData } = await supabase.from('vendor_clients').select('*').eq('vendor_id', vendorId).order('full_name');
        setClients(clientsData || []);
      };
      fetchData();
    }
  }, [isOpen, vendorId]);

  // Handle Client Selection
  const handleClientSelect = (clientId: string) => {
      setSelectedClientId(clientId);
      const client = clients.find(c => c.id === clientId);
      if (client) {
          setGuestName(client.full_name);
          setGuestPhone(client.phone_number || '');
      } else {
          setGuestName('');
          setGuestPhone('');
      }
  };

  const handleSubmit = async () => {
    if (!formData.hall_id || !guestName) {
        toast({ title: 'نقص في البيانات', description: 'يرجى اختيار القاعة واسم العميل.', variant: 'destructive' });
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(formData.booking_date!);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
        toast({ title: 'تاريخ غير صالح', description: 'لا يمكن اختيار تاريخ في الماضي.', variant: 'destructive' });
        return;
    }

    if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
        toast({ title: 'توقيت غير منطقي', description: 'يجب أن يكون وقت الدخول قبل وقت الخروج.', variant: 'destructive' });
        return;
    }

    setLoading(true);
    try {
        let finalPaidAmount = 0;
        if (formData.payment_status === 'paid') {
            finalPaidAmount = formData.total_amount || 0;
        } else if (formData.payment_status === 'partial') {
            finalPaidAmount = Number(formData.paid_amount) || 0;
            if (finalPaidAmount <= 0) throw new Error('يرجى إدخال مبلغ المقدم بشكل صحيح.');
            if (finalPaidAmount >= (formData.total_amount || 0)) formData.payment_status = 'paid'; 
        }

        // Check if we need to create a new client implicitly (if not selected from list)
        // This is handled by the DB trigger `sync_booking_to_crm` usually, but we send the raw name/phone here.

        const payload = {
            ...formData,
            paid_amount: finalPaidAmount,
            vendor_id: vendorId,
            user_id: null, // Allow guest booking
            vat_amount: (formData.total_amount || 0) * 0.15,
            guest_name: guestName,
            guest_phone: guestPhone,
            notes: formData.notes
        };

        const { error } = await supabase.from('bookings').insert([payload]);
        if (error) throw error;

        toast({ title: 'تمت الإضافة', description: 'تم إنشاء الحجز وتحديث سجل العملاء.', variant: 'success' });
        onSuccess();
        onClose();
        
        // Reset
        setGuestName('');
        setGuestPhone('');
        setSelectedClientId('');
        setFormData(prev => ({ ...prev, paid_amount: 0 }));
    } catch (err: any) {
        toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة حجز جديد">
        <div className="space-y-5 text-right">
            {/* Hall Selection */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">القاعة / الباقة</label>
                <select 
                    className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm font-bold bg-white focus:ring-2 focus:ring-primary/10 outline-none"
                    value={formData.hall_id}
                    onChange={e => {
                        const hall = halls.find(h => h.id === e.target.value);
                        setFormData({...formData, hall_id: e.target.value, total_amount: hall?.price_per_night || 0});
                    }}
                >
                    {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
            </div>

            {/* Client Selection (Connected) */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><UserCheck className="w-4 h-4" /> بيانات العميل</label>
                    {selectedClientId && <button onClick={() => { setSelectedClientId(''); setGuestName(''); setGuestPhone(''); }} className="text-[10px] text-red-500 font-bold hover:underline">إلغاء التحديد</button>}
                </div>
                
                <select 
                    className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm font-bold bg-white focus:ring-2 focus:ring-primary/10 outline-none"
                    value={selectedClientId}
                    onChange={e => handleClientSelect(e.target.value)}
                >
                    <option value="">-- اختر عميل سابق --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.phone_number})</option>)}
                </select>

                <div className="grid grid-cols-2 gap-3 pt-2">
                    <Input placeholder="اسم العميل (جديد)" value={guestName} onChange={e => { setGuestName(e.target.value); if(selectedClientId) setSelectedClientId(''); }} className="bg-white" />
                    <Input placeholder="رقم الجوال" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="bg-white" />
                </div>
            </div>

            {/* Financials */}
            <div className="grid grid-cols-2 gap-3">
                <Input type="date" label="تاريخ الحجز" value={formData.booking_date} onChange={e => setFormData({...formData, booking_date: e.target.value})} className="h-12" />
                <Input type="number" label="المبلغ الإجمالي" value={formData.total_amount} onChange={e => setFormData({...formData, total_amount: Number(e.target.value)})} className="h-12" />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Input type="time" label="وقت الدخول" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="h-12" />
                <Input type="time" label="وقت الخروج" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="h-12" />
            </div>

            {/* Payment Status */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">حالة الدفع</label>
                    <select 
                        className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm font-bold bg-white focus:ring-2 focus:ring-primary/10 outline-none"
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
                        className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm font-bold bg-white focus:ring-2 focus:ring-primary/10 outline-none"
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value as any})}
                    >
                        <option value="confirmed">مؤكد</option>
                        <option value="pending">قيد الانتظار</option>
                    </select>
                </div>
            </div>

            {formData.payment_status === 'partial' && (
                <div className="animate-in slide-in-from-top-2 fade-in">
                    <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-yellow-700">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>قيمة العربون / المقدم</span>
                        </div>
                        <Input 
                            type="number" 
                            value={formData.paid_amount} 
                            onChange={e => setFormData({...formData, paid_amount: Number(e.target.value)})}
                            className="bg-white border-yellow-200 focus:border-yellow-400 h-12"
                        />
                        <p className="text-[10px] text-gray-400 font-bold text-left px-1">
                            المتبقي للتحصيل: {Math.max(0, (formData.total_amount || 0) - (formData.paid_amount || 0))} ر.س
                        </p>
                    </div>
                </div>
            )}

            <Button onClick={handleSubmit} disabled={loading} className="w-full h-14 rounded-xl font-black mt-4 border-2 border-primary/10 hover:border-primary/30">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ وإنشاء الحجز'}
            </Button>
        </div>
    </Modal>
  );
};
