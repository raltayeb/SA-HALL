
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, VendorClient } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Search, Plus, Edit3, Trash2, User, Phone, Mail, MapPin, Loader2, Star, UserCheck } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const VendorClients: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [clients, setClients] = useState<VendorClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState<Partial<VendorClient>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from('vendor_clients').select('*').eq('vendor_id', user.id).order('created_at', { ascending: false });
    setClients(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, [user.id]);

  const handleSave = async () => {
    if (!currentClient.full_name) {
        toast({ title: 'خطأ', description: 'اسم العميل مطلوب', variant: 'destructive' });
        return;
    }
    setSaving(true);
    const payload = { ...currentClient, vendor_id: user.id };
    
    const { error } = currentClient.id 
      ? await supabase.from('vendor_clients').update(payload).eq('id', currentClient.id)
      : await supabase.from('vendor_clients').insert([payload]);

    if (!error) {
      toast({ title: 'تم الحفظ', variant: 'success' });
      setIsModalOpen(false);
      fetchClients();
    } else {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if(!confirm('هل أنت متأكد من حذف العميل؟')) return;
    const { error } = await supabase.from('vendor_clients').delete().eq('id', id);
    if (!error) {
        toast({ title: 'تم الحذف', variant: 'success' });
        fetchClients();
    }
  };

  const filteredClients = clients.filter(c => 
    c.full_name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone_number?.includes(search)
  );

  return (
    <div className="space-y-8 animate-in fade-in pb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-[2rem] border border-gray-100">
            <div>
                <h2 className="text-3xl font-ruqaa text-primary flex items-center gap-2">
                    إدارة العملاء <UserCheck className="w-8 h-8" />
                </h2>
                <p className="text-sm text-gray-400 mt-1 font-bold">قاعدة بيانات عملائك وسجل التواصل.</p>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <input 
                        className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-10 text-right font-bold outline-none focus:ring-1 ring-primary/20"
                        placeholder="بحث بالاسم أو الجوال..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
                <Button onClick={() => { setCurrentClient({}); setIsModalOpen(true); }} className="h-12 px-6 rounded-xl font-bold gap-2">
                    <Plus className="w-5 h-5" /> عميل جديد
                </Button>
            </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
                Array.from({length: 3}).map((_, i) => <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-[2rem]"></div>)
            ) : filteredClients.length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-400 font-bold border-2 border-dashed rounded-[2rem]">لا يوجد عملاء مضافين</div>
            ) : filteredClients.map(client => (
                <div key={client.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 hover:border-primary/20 transition-all group relative">
                    {client.is_vip && <div className="absolute top-4 left-4 text-yellow-500"><Star className="w-5 h-5 fill-current" /></div>}
                    
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center text-primary font-black text-lg">
                            {client.full_name[0]}
                        </div>
                        <div>
                            <h3 className="font-black text-lg text-gray-900">{client.full_name}</h3>
                            <span className="text-[10px] bg-gray-50 px-2 py-0.5 rounded text-gray-500 font-bold">{client.profile_id ? 'مسجل في التطبيق' : 'عميل خارجي'}</span>
                        </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-500 mb-6">
                        {client.phone_number && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-300" /> {client.phone_number}</div>}
                        {client.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-300" /> {client.email}</div>}
                        {client.address && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-300" /> {client.address}</div>}
                    </div>

                    <div className="flex gap-2 border-t border-gray-50 pt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setCurrentClient(client); setIsModalOpen(true); }} className="flex-1 py-2 bg-gray-50 rounded-xl text-xs font-bold text-gray-600 hover:bg-white hover:shadow hover:text-primary transition-all flex items-center justify-center gap-1"><Edit3 className="w-3 h-3" /> تعديل</button>
                        <button onClick={() => handleDelete(client.id)} className="w-9 h-9 bg-red-50 rounded-xl text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>
            ))}
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentClient.id ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}>
            <div className="space-y-4 text-right">
                <Input label="الاسم الكامل" value={currentClient.full_name || ''} onChange={e => setCurrentClient({...currentClient, full_name: e.target.value})} className="h-12 rounded-xl" />
                <div className="grid grid-cols-2 gap-4">
                    <Input label="رقم الجوال" value={currentClient.phone_number || ''} onChange={e => setCurrentClient({...currentClient, phone_number: e.target.value})} className="h-12 rounded-xl" />
                    <Input label="البريد الإلكتروني" value={currentClient.email || ''} onChange={e => setCurrentClient({...currentClient, email: e.target.value})} className="h-12 rounded-xl" />
                </div>
                <Input label="العنوان" value={currentClient.address || ''} onChange={e => setCurrentClient({...currentClient, address: e.target.value})} className="h-12 rounded-xl" />
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">ملاحظات</label>
                    <textarea 
                        className="w-full h-24 border border-gray-200 rounded-xl p-3 text-sm font-bold bg-white focus:ring-1 ring-primary/20 outline-none resize-none"
                        value={currentClient.notes || ''}
                        onChange={e => setCurrentClient({...currentClient, notes: e.target.value})}
                    />
                </div>
                <div className="flex items-center gap-2 bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                    <input type="checkbox" checked={currentClient.is_vip || false} onChange={e => setCurrentClient({...currentClient, is_vip: e.target.checked})} className="w-5 h-5 accent-yellow-500" />
                    <span className="text-sm font-bold text-yellow-700">عميل مميز (VIP)</span>
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full h-12 rounded-xl font-bold mt-4">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ البيانات'}
                </Button>
            </div>
        </Modal>
    </div>
  );
};
