
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Hall, Booking, VendorClient } from '../../types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Loader2, AlertCircle, UserCheck, CalendarCheck, Coins, CreditCard, User, Phone, FileText } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface AddBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;
  onSuccess: () => void;
}

export const AddBookingModal: React.FC<AddBookingModalProps> = ({ isOpen, onClose, vendorId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [halls, setHalls] = useState<{id: string, name: string, price: number, type: string}[]>([]);
  const [clients, setClients] = useState<VendorClient[]>([]); 
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<Booking>>({
    booking_date: new Date().toISOString().split('T')[0],
    payment_status: 'unpaid',
    status: 'confirmed',
    total_amount: 0,
    paid_amount: 0,
    notes: '' 
  });

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        const [hallsRes, chaletsRes, clientsRes] = await Promise.all([
            supabase.from('halls').select('id, name, price_per_night').eq('vendor_id', vendorId),
            supabase.from('chalets').select('id, name, price_per_night').eq('vendor_id', vendorId),
            supabase.from('vendor_clients').select('*').eq('vendor_id', vendorId).order('full_name')
        ]);

        const allAssets = [
            ...(hallsRes.data || []).map(h => ({...h, type: 'hall'})),
            ...(chaletsRes.data || []).map(c => ({...c, type: 'chalet'}))
        ];
        
        setHalls(allAssets as any);
        setClients(clientsRes.data || []);

        if (allAssets.length > 0) {
            setFormData(prev => ({ 
              ...prev, 
              hall_id: allAssets[0].type === 'hall' ? allAssets[0].id : undefined,
              chalet_id: allAssets[0].type === 'chalet' ? allAssets[0].id : undefined,
              total_amount: allAssets[0].price_per_night || 0,
              paid_amount: 0
            }));
        }
      };
      fetchData();
    }
  }, [isOpen, vendorId]);

  const handleAssetChange = (assetId: string) => {
      const asset = halls.find(h => h.id === assetId);
      if (asset) {
          setFormData(prev => ({
              ...prev,
              hall_id: asset.type === 'hall' ? asset.id : null,
              chalet_id: asset.type === 'chalet' ? asset.id : null,
              total_amount: asset.price || 0
          }));
      }
  };

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
    if ((!formData.hall_id && !formData.chalet_id) || !guestName) {
        toast({ title: 'بيانات ناقصة', description: 'يرجى اختيار المكان واسم العميل.', variant: 'destructive' });
        return;
    }

    setLoading(true);
    try {
        let finalPaidAmount = 0;
        if (formData.payment_status === 'paid') {
            finalPaidAmount = formData.total_amount || 0;
        } else if (formData.payment_status === 'partial') {
            finalPaidAmount = Number(formData.paid_amount) || 0;
        }

        const payload = {
            ...formData,
            paid_amount: finalPaidAmount,
            vendor_id: vendorId,
            user_id: null, 
            vat_amount: (formData.total_amount || 0) * 0.15,
            guest_name: guestName,
            guest_phone: guestPhone,
            notes: formData.notes
        };

        const { error } = await supabase.from('bookings').insert([payload]);
        if (error) throw error;

        toast({ title: 'تمت الإضافة', description: 'تم إنشاء الحجز بنجاح.', variant: 'success' });
        onSuccess();
        onClose();
        
        // Reset
        setGuestName('');
        setGuestPhone('');
    } catch (err: any) {
        toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسجيل حجز جديد">
        <div className="space-y-6 text-right font-tajawal">
            
            {/* 1. Asset & Date */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><CalendarCheck className="w-3.5 h-3.5" /> المكان</label>
                    <select 
                        className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm font-bold bg-white focus:ring-2 focus:ring-primary/10 outline-none"
                        onChange={e => handleAssetChange(e.target.value)}
                    >
                        {halls.map(h => <option key={h.id} value={h.id}>{h.name} ({h.type === 'hall' ? 'قاعة' : 'شاليه'})</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">تاريخ الحجز</label>
                    <Input type="date" value={formData.booking_date} onChange={e => setFormData({...formData, booking_date: e.target.value})} className="h-12 rounded-xl font-bold" />
                </div>
            </div>

            {/* 2. Client Info */}
            <div className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2"><UserCheck className="w-4 h-4" /> بيانات العميل</h4>
                    <select 
                        className="h-8 border border-gray-200 rounded-lg px-2 text-xs font-bold bg-white outline-none"
                        value={selectedClientId}
                        onChange={e => handleClientSelect(e.target.value)}
                    >
                        <option value="">اختر عميل سابق</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="الاسم الكامل" value={guestName} onChange={e => setGuestName(e.target.value)} className="h-12 rounded-xl bg-white" icon={<User className="w-4 h-4" />} />
                    <Input placeholder="رقم الجوال" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="h-12 rounded-xl bg-white" icon={<Phone className="w-4 h-4" />} />
                </div>
            </div>

            {/* 3. Financials */}
            <div className="bg-white border border-gray-100 p-5 rounded-[2rem] space-y-4 shadow-sm">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Coins className="w-4 h-4" /> التفاصيل المالية</h4>
                <div className="grid grid-cols-2 gap-4">
                    <Input label="المبلغ الإجمالي" type="number" value={formData.total_amount} onChange={e => setFormData({...formData, total_amount: Number(e.target.value)})} className="h-12 rounded-xl text-right font-black" />
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500">حالة الدفع</label>
                        <select 
                            className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm font-bold bg-gray-50 outline-none"
                            value={formData.payment_status}
                            onChange={e => setFormData({...formData, payment_status: e.target.value as any})}
                        >
                            <option value="unpaid">أجل (غير مدفوع)</option>
                            <option value="partial">دفعة مقدمة (عربون)</option>
                            <option value="paid">مدفوع بالكامل</option>
                        </select>
                    </div>
                </div>
                
                {formData.payment_status === 'partial' && (
                    <div className="animate-in slide-in-from-top-2 fade-in bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-yellow-600" />
                        <Input 
                            label="قيمة العربون" 
                            type="number" 
                            value={formData.paid_amount} 
                            onChange={e => setFormData({...formData, paid_amount: Number(e.target.value)})}
                            className="h-10 bg-white border-yellow-200"
                        />
                    </div>
                )}
            </div>

            {/* 4. Notes */}
            <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> ملاحظات إضافية</label>
                <textarea 
                    className="w-full h-20 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold outline-none resize-none focus:bg-white focus:border-primary/20 transition-all"
                    placeholder="أي تفاصيل إضافية عن الحجز..."
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                />
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full h-14 rounded-2xl font-black text-lg bg-gray-900 text-white shadow-xl hover:bg-black transition-transform active:scale-95">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'تأكيد وحفظ الحجز'}
            </Button>
        </div>
    </Modal>
  );
};
