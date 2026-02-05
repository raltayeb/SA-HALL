
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Role } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Users, Edit, Trash2, Search, Plus, ShieldAlert, Phone, Building, CheckCircle2, Shield } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface FormErrors {
  general?: string;
  email?: string;
  full_name?: string;
}

export const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<UserProfile>>({});
  const [errors, setErrors] = useState<FormErrors>({});

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setUsers(data as UserProfile[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;
    if (!currentUser.full_name?.trim()) { newErrors.full_name = 'الاسم الكامل مطلوب'; isValid = false; }
    if (!currentUser.email?.trim()) { newErrors.email = 'البريد الإلكتروني مطلوب'; isValid = false; }
    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    setErrors({});
    if (!validateForm()) return;
    setLoading(true);

    try {
        if (!currentUser.id) {
            const { data: existing } = await supabase.from('profiles').select('id').eq('email', currentUser.email).maybeSingle(); 
            if (existing) throw new Error('البريد الإلكتروني مسجل بالفعل.');
        }

        let error;
        if (currentUser.id) {
            const { error: updateError } = await supabase.from('profiles').update({ 
                full_name: currentUser.full_name, 
                role: currentUser.role,
                phone_number: currentUser.phone_number,
                business_name: currentUser.business_name
            }).eq('id', currentUser.id);
            error = updateError;
        } else {
            const fakeId = crypto.randomUUID(); 
            const { error: insertError } = await supabase.from('profiles').insert([{
                id: fakeId,
                email: currentUser.email,
                full_name: currentUser.full_name,
                role: currentUser.role || 'user',
                phone_number: currentUser.phone_number,
                business_name: currentUser.business_name
            }]);
            error = insertError;
        }

        if (error) throw error;

        setIsModalOpen(false);
        setCurrentUser({});
        fetchUsers();
        toast({ title: 'تم الحفظ', variant: 'success' });

    } catch (err: any) {
        setErrors(prev => ({ ...prev, general: err.message }));
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', id);
            if (error) throw error;
            fetchUsers();
            toast({ title: 'تم الحذف', variant: 'success' });
        } catch (err: any) {
             toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
        }
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 text-right pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
            <h2 className="text-3xl font-ruqaa text-primary">إدارة المستخدمين</h2>
            <p className="text-sm text-muted-foreground mt-1">التحكم في حسابات المستخدمين والبائعين.</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Input 
                    placeholder="بحث..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-12 rounded-xl bg-white pr-10"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <Button onClick={() => { setCurrentUser({ role: 'user' }); setErrors({}); setIsModalOpen(true); }} className="h-12 px-6 rounded-xl font-bold gap-2 shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4" /> إضافة مستخدم
            </Button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-right text-sm">
            <thead className="bg-gray-50/50 text-gray-500 text-xs font-black uppercase">
                <tr>
                    <th className="p-6">المستخدم</th>
                    <th className="p-6">الدور</th>
                    <th className="p-6">البيانات</th>
                    <th className="p-6">تاريخ الانضمام</th>
                    <th className="p-6 text-center">إجراءات</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {loading ? (
                    <tr><td colSpan={5} className="p-10 text-center animate-pulse">جاري التحميل...</td></tr>
                ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-gray-400">لا يوجد مستخدمين مطابقين</td></tr>
                ) : filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="p-6">
                            <div className="font-bold text-gray-900">{u.full_name}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{u.email}</div>
                        </td>
                        <td className="p-6">
                            <span className={`
                                inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black
                                ${u.role === 'super_admin' ? 'bg-red-50 text-red-600' : 
                                  u.role === 'vendor' ? 'bg-purple-50 text-purple-600' : 
                                  'bg-gray-100 text-gray-600'}
                            `}>
                                {u.role === 'super_admin' ? <Shield className="w-3 h-3" /> : u.role === 'vendor' ? <Building className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                                {u.role === 'super_admin' ? 'مدير' : u.role === 'vendor' ? 'بائع' : 'مستخدم'}
                            </span>
                        </td>
                        <td className="p-6">
                            {u.phone_number ? <div className="text-xs font-bold text-gray-600 flex items-center gap-1"><Phone className="w-3 h-3" /> {u.phone_number}</div> : '-'}
                            {u.business_name && <div className="text-[10px] text-gray-400 mt-1">{u.business_name}</div>}
                        </td>
                        <td className="p-6 text-xs text-gray-500 font-bold">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString('ar-SA') : '-'}
                        </td>
                        <td className="p-6 text-center">
                            <div className="flex justify-center gap-2">
                                <button onClick={() => { setCurrentUser(u); setErrors({}); setIsModalOpen(true); }} className="p-2 bg-gray-50 text-gray-500 rounded-xl hover:text-primary hover:bg-white hover:shadow-sm transition-all"><Edit className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(u.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentUser.id ? 'تعديل البيانات' : 'مستخدم جديد'}>
        <div className="space-y-4 text-right">
            {errors.general && <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl font-bold">{errors.general}</div>}
            
            <Input label="الاسم الكامل" value={currentUser.full_name || ''} onChange={e => setCurrentUser({...currentUser, full_name: e.target.value})} error={errors.full_name} className="h-12 rounded-xl" />
            <Input label="البريد الإلكتروني" value={currentUser.email || ''} onChange={e => setCurrentUser({...currentUser, email: e.target.value})} disabled={!!currentUser.id} className="h-12 rounded-xl" error={errors.email} />

            <div className="grid grid-cols-2 gap-4">
                <Input label="رقم الهاتف" value={currentUser.phone_number || ''} onChange={e => setCurrentUser({...currentUser, phone_number: e.target.value})} className="h-12 rounded-xl" />
                <Input label="اسم النشاط" value={currentUser.business_name || ''} onChange={e => setCurrentUser({...currentUser, business_name: e.target.value})} className="h-12 rounded-xl" />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">الصلاحية</label>
                <div className="flex gap-2">
                    {(['user', 'vendor', 'super_admin'] as Role[]).map((r) => (
                        <button 
                            key={r}
                            onClick={() => setCurrentUser({...currentUser, role: r})}
                            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border ${currentUser.role === r ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white border-gray-200 text-gray-500'}`}
                        >
                            {r === 'super_admin' ? 'مدير' : r === 'vendor' ? 'بائع' : 'مستخدم'}
                        </button>
                    ))}
                </div>
            </div>

            <Button onClick={handleSave} disabled={loading} className="w-full h-12 rounded-xl font-black mt-4 shadow-lg shadow-primary/20">
                {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
        </div>
      </Modal>
    </div>
  );
};
