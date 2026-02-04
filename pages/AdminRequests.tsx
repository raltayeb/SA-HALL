
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Inbox, CheckCircle, XCircle, Building2, Sparkles, User, Check, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface RequestWithProfile {
  id: string;
  request_type: 'hall' | 'service';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  vendor_id: string;
  profiles: {
    full_name: string;
    business_name: string;
    hall_limit: number;
    service_limit: number;
  };
}

export const AdminRequests: React.FC = () => {
  const [requests, setRequests] = useState<RequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('upgrade_requests')
      .select('*, profiles:vendor_id(full_name, business_name, hall_limit, service_limit)')
      .order('created_at', { ascending: false });
    
    if (data) setRequests(data as any[]);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleAction = async (request: RequestWithProfile, action: 'approve' | 'reject') => {
    try {
        if (action === 'approve') {
            // 1. Increment Limit
            const updateField = request.request_type === 'hall' ? 'hall_limit' : 'service_limit';
            const currentLimit = request.request_type === 'hall' ? request.profiles.hall_limit : request.profiles.service_limit;
            
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ [updateField]: currentLimit + 1 })
                .eq('id', request.vendor_id);
            
            if (profileError) throw profileError;
        }

        // 2. Update Request Status
        const { error: reqError } = await supabase
            .from('upgrade_requests')
            .update({ status: action === 'approve' ? 'approved' : 'rejected' })
            .eq('id', request.id);

        if (reqError) throw reqError;

        toast({ title: 'تم التنفيذ', description: `تم ${action === 'approve' ? 'الموافقة على' : 'رفض'} الطلب بنجاح.`, variant: 'success' });
        fetchRequests();

    } catch (err: any) {
        toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 text-right">
      <div>
        <h2 className="text-3xl font-ruqaa text-primary flex items-center gap-2 justify-end">
           طلبات الترقية <Inbox className="w-8 h-8" />
        </h2>
        <p className="text-sm text-muted-foreground mt-1">مراجعة طلبات البائعين لإضافة المزيد من القاعات أو الخدمات.</p>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-right">
            <thead className="bg-gray-50/50 text-gray-500 text-xs font-black uppercase">
                <tr>
                    <th className="p-5">البائع</th>
                    <th className="p-5">نوع الطلب</th>
                    <th className="p-5">الحد الحالي</th>
                    <th className="p-5">تاريخ الطلب</th>
                    <th className="p-5">الحالة</th>
                    <th className="p-5 text-center">إجراءات</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {loading ? (
                    <tr><td colSpan={6} className="p-10 text-center animate-pulse">جاري التحميل...</td></tr>
                ) : requests.length === 0 ? (
                    <tr><td colSpan={6} className="p-10 text-center text-gray-400 font-bold">لا توجد طلبات جديدة</td></tr>
                ) : requests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-50/30 transition-colors group">
                        <td className="p-5">
                            <div className="font-bold text-gray-900">{req.profiles?.business_name || 'غير محدد'}</div>
                            <div className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-1"><User className="w-3 h-3" /> {req.profiles?.full_name}</div>
                        </td>
                        <td className="p-5">
                            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold ${req.request_type === 'hall' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                {req.request_type === 'hall' ? <Building2 className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                                {req.request_type === 'hall' ? 'إضافة قاعة' : 'إضافة خدمة'}
                            </span>
                        </td>
                        <td className="p-5 font-bold text-sm text-gray-600">
                            {req.request_type === 'hall' ? req.profiles?.hall_limit : req.profiles?.service_limit}
                        </td>
                        <td className="p-5 text-xs text-gray-500 font-bold">
                            {new Date(req.created_at).toLocaleDateString('ar-SA')}
                        </td>
                        <td className="p-5">
                            <Badge variant={req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'destructive' : 'warning'}>
                                {req.status === 'approved' ? 'مقبول' : req.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                            </Badge>
                        </td>
                        <td className="p-5">
                            {req.status === 'pending' && (
                                <div className="flex justify-center gap-2">
                                    <Button size="sm" onClick={() => handleAction(req, 'approve')} className="h-9 w-9 p-0 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 border-green-200"><Check className="w-4 h-4" /></Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleAction(req, 'reject')} className="h-9 w-9 p-0 rounded-xl"><X className="w-4 h-4" /></Button>
                                </div>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};
