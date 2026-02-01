
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
// Corrected import: PriceTag is a component, not a member of types.ts, and it's not used in this file.
import { UserProfile } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ShieldCheck, Search, Users, ExternalLink, Power, PowerOff, Mail, Phone, Calendar, Building2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const VendorSubscriptions: React.FC = () => {
  const [subscribers, setSubscribers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSub, setSelectedSub] = useState<UserProfile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { toast } = useToast();

  const fetchSubscribers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'vendor')
      .order('created_at', { ascending: false });

    if (data) setSubscribers(data as UserProfile[]);
    setLoading(false);
  };

  useEffect(() => { fetchSubscribers(); }, []);

  const toggleStatus = async (sub: UserProfile) => {
    const newStatus = !sub.is_enabled;
    const { error } = await supabase.from('profiles').update({ is_enabled: newStatus }).eq('id', sub.id);
    if (!error) {
      toast({ title: newStatus ? 'تم التنشيط' : 'تم التعطيل', variant: 'success' });
      fetchSubscribers();
      if(selectedSub?.id === sub.id) setSelectedSub({...selectedSub, is_enabled: newStatus});
    }
  };

  const filtered = subscribers.filter(s => 
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.business_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-right">
      <div className="flex justify-between items-center flex-row-reverse">
        <div>
          <h2 className="text-3xl font-ruqaa text-primary">إدارة المشتركين</h2>
          <p className="text-sm text-muted-foreground">عرض بيانات البائعين والتحكم في صلاحية وصولهم للمنصة.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 max-w-md ml-auto">
        <Search className="w-5 h-5 text-gray-400" />
        <input 
          type="text" placeholder="بحث باسم البائع أو النشاط..." 
          className="bg-transparent border-none focus:outline-none text-sm w-full text-right font-bold"
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-50/50 text-gray-500">
            <tr>
              <th className="p-5 font-black uppercase tracking-widest text-[10px]">البائع والنشاط</th>
              <th className="p-5 font-black uppercase tracking-widest text-[10px]">الحالة</th>
              <th className="p-5 font-black uppercase tracking-widest text-[10px]">تاريخ الانضمام</th>
              <th className="p-5 font-black uppercase tracking-widest text-[10px]">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={4} className="p-20 text-center animate-pulse font-bold">جاري التحميل...</td></tr>
            ) : filtered.map(sub => (
              <tr key={sub.id} className="hover:bg-gray-50/30 transition-colors cursor-pointer" onClick={() => { setSelectedSub(sub); setIsDetailOpen(true); }}>
                <td className="p-5">
                  <div className="font-black text-gray-900">{sub.business_name || 'نشاط جديد'}</div>
                  <div className="text-[11px] text-gray-400">{sub.full_name}</div>
                </td>
                <td className="p-5">
                  <Badge variant={sub.is_enabled ? 'success' : 'destructive'} className="rounded-lg">
                    {sub.is_enabled ? 'نشط' : 'معطل'}
                  </Badge>
                </td>
                <td className="p-5 text-gray-400 font-bold">{new Date(sub.created_at || '').toLocaleDateString('ar-SA')}</td>
                <td className="p-5">
                  <div className="flex gap-2 justify-end" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-primary hover:bg-primary/5" onClick={() => { setSelectedSub(sub); setIsDetailOpen(true); }}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" size="icon" 
                      className={`rounded-xl h-10 w-10 ${sub.is_enabled ? 'text-red-500' : 'text-green-500'}`}
                      onClick={() => toggleStatus(sub)}
                    >
                      {sub.is_enabled ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Subscriber Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="ملف المشترك">
        {selectedSub && (
          <div className="space-y-8 text-right">
            <div className="flex items-center gap-6 flex-row-reverse">
              <div className="w-24 h-24 rounded-[2rem] bg-gray-100 flex items-center justify-center overflow-hidden border">
                {selectedSub.custom_logo_url ? <img src={selectedSub.custom_logo_url} className="w-full h-full object-contain" /> : <Users className="w-10 h-10 text-gray-300" />}
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-2xl font-black text-gray-900">{selectedSub.business_name || 'بدون اسم تجاري'}</h3>
                <p className="text-gray-500 font-bold">{selectedSub.full_name}</p>
                <Badge variant={selectedSub.is_enabled ? 'success' : 'destructive'}>{selectedSub.is_enabled ? 'الحساب مفعل' : 'الحساب معطل'}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50 space-y-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-end gap-2">البريد الإلكتروني <Mail className="w-3 h-3" /></span>
                <p className="text-sm font-bold">{selectedSub.email}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 space-y-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-end gap-2">رقم التواصل <Phone className="w-3 h-3" /></span>
                <p className="text-sm font-bold">{selectedSub.phone_number || 'غير متوفر'}</p>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t">
               <h4 className="font-black text-sm">إجراءات إدارية</h4>
               <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold" onClick={() => toggleStatus(selectedSub)}>
                    {selectedSub.is_enabled ? 'تعطيل الحساب مؤقتاً' : 'تنشيط حساب البائع'}
                  </Button>
                  <Button variant="destructive" className="rounded-xl h-12 px-6"><PowerOff className="w-4 h-4" /></Button>
               </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
