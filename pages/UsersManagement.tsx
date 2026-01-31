
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Role } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Users, Edit, Trash2, Search, Plus, ShieldAlert, Phone, Building } from 'lucide-react';
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
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<UserProfile>>({});
  
  // Centralized Error State
  const [errors, setErrors] = useState<FormErrors>({});

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setUsers(data as UserProfile[]);
    } else {
        console.error('Error fetching users:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!currentUser.full_name?.trim()) {
      newErrors.full_name = 'الاسم الكامل مطلوب';
      isValid = false;
    }

    if (!currentUser.email?.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(currentUser.email)) {
        newErrors.email = 'يرجى إدخال بريد إلكتروني صحيح';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    setErrors({});
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
        // 2. Check if email exists (Only for CREATE operation)
        if (!currentUser.id) {
            const { data: existingUser, error: checkError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', currentUser.email)
                .maybeSingle(); 

            if (checkError) {
                throw new Error('فشل في التحقق من وجود المستخدم: ' + checkError.message);
            }

            if (existingUser) {
                throw new Error('هذا البريد الإلكتروني مسجل بالفعل لمستخدم آخر.');
            }
        }

        let error;

        // 3. Perform Insert or Update
        if (currentUser.id) {
            // Update
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                    full_name: currentUser.full_name, 
                    role: currentUser.role,
                    phone_number: currentUser.phone_number,
                    business_name: currentUser.business_name
                })
                .eq('id', currentUser.id);
            error = updateError;
        } else {
            // Create
            const fakeId = crypto.randomUUID(); 
            const { error: insertError } = await supabase
                .from('profiles')
                .insert([{
                    id: fakeId,
                    email: currentUser.email,
                    full_name: currentUser.full_name,
                    role: currentUser.role || 'user',
                    phone_number: currentUser.phone_number,
                    business_name: currentUser.business_name
                }]);
            error = insertError;
        }

        if (error) {
            if (error.message.includes('row-level security')) {
                throw new Error('ليس لديك صلاحية لإجراء هذا التعديل. تأكد من أن حسابك يمتلك صلاحية "مدير نظام" (Super Admin).');
            }
            throw error;
        }

        // Success
        setIsModalOpen(false);
        setCurrentUser({});
        fetchUsers();
        toast({ title: 'تم الحفظ', description: 'تم تحديث بيانات المستخدم بنجاح', variant: 'success' });

    } catch (err: any) {
        console.error(err);
        setErrors(prev => ({ ...prev, general: err.message || 'حدث خطأ غير متوقع' }));
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟ سيتم حذف جميع الحجوزات والقاعات المرتبطة به.')) {
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', id);
            if (error) throw error;
            
            fetchUsers();
            toast({ title: 'تم الحذف', description: 'تم حذف المستخدم بنجاح', variant: 'success' });
        } catch (err: any) {
             toast({ title: 'خطأ', description: 'فشل الحذف: ' + err.message, variant: 'destructive' });
        }
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                إدارة المستخدمين
            </h2>
            <p className="text-sm text-muted-foreground">عرض وتعديل صلاحيات المستخدمين والبائعين.</p>
        </div>
        <Button onClick={() => { setCurrentUser({ role: 'user' }); setErrors({}); setIsModalOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> إضافة مستخدم
        </Button>
      </div>

      <div className="flex items-center gap-2 bg-card p-2 rounded-lg border max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input 
            type="text" 
            placeholder="بحث بالاسم أو البريد..." 
            className="bg-transparent border-none focus:outline-none text-sm w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
                <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                        <th className="p-4 font-medium">المستخدم</th>
                        <th className="p-4 font-medium">البريد الإلكتروني</th>
                        <th className="p-4 font-medium">الدور (الصلاحية)</th>
                        <th className="p-4 font-medium">تاريخ الانضمام</th>
                        <th className="p-4 font-medium">إجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {loading ? (
                        <tr><td colSpan={5} className="p-8 text-center">جاري التحميل...</td></tr>
                    ) : filteredUsers.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">لا يوجد مستخدمين مطابقين</td></tr>
                    ) : (
                        filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                                <td className="p-4 font-medium">{u.full_name}</td>
                                <td className="p-4 text-muted-foreground font-mono text-xs">{u.email}</td>
                                <td className="p-4">
                                    <span className={`
                                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${u.role === 'super_admin' ? 'bg-destructive/10 text-destructive' : 
                                          u.role === 'vendor' ? 'bg-primary/10 text-primary' : 
                                          'bg-secondary text-secondary-foreground'}
                                    `}>
                                        {u.role === 'super_admin' ? 'مدير نظام' : u.role === 'vendor' ? 'بائع (قاعات)' : 'مستخدم'}
                                    </span>
                                </td>
                                <td className="p-4 text-muted-foreground">
                                    {u.created_at ? new Date(u.created_at).toLocaleDateString('ar-SA') : '-'}
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => { setCurrentUser(u); setErrors({}); setIsModalOpen(true); }}>
                                            <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => handleDelete(u.id)}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={currentUser.id ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {errors.general && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                    {errors.general}
                </div>
            )}
            
            {!currentUser.id && (
                 <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-3 rounded-md text-xs flex gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <p>ملاحظة: هذا المستخدم لن يتمكن من تسجيل الدخول حتى يتم إنشاء حساب Auth بنفس المعرف (يتطلب تدخل برمجي).</p>
                 </div>
            )}
            
            <Input 
                label="الاسم الكامل"
                value={currentUser.full_name || ''}
                onChange={e => setCurrentUser({...currentUser, full_name: e.target.value})}
                error={errors.full_name}
            />
            
            <Input 
                label="البريد الإلكتروني"
                type="email"
                value={currentUser.email || ''}
                onChange={e => setCurrentUser({...currentUser, email: e.target.value})}
                disabled={!!currentUser.id} 
                className={currentUser.id ? 'opacity-50' : ''}
                error={errors.email}
            />

            <div className="grid grid-cols-2 gap-4">
                <Input 
                    label="رقم الهاتف"
                    type="tel"
                    placeholder="05xxxxxxx"
                    value={currentUser.phone_number || ''}
                    onChange={e => setCurrentUser({...currentUser, phone_number: e.target.value})}
                />
                <Input 
                    label="اسم النشاط التجاري"
                    placeholder="للبائعين فقط"
                    value={currentUser.business_name || ''}
                    onChange={e => setCurrentUser({...currentUser, business_name: e.target.value})}
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">نوع الصلاحية</label>
                <div className="grid grid-cols-3 gap-2">
                    {(['user', 'vendor', 'super_admin'] as Role[]).map((r) => (
                        <div 
                            key={r}
                            onClick={() => setCurrentUser({...currentUser, role: r})}
                            className={`
                                cursor-pointer rounded-lg border p-2 text-center text-sm transition-all
                                ${currentUser.role === r 
                                    ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary' 
                                    : 'hover:bg-accent'}
                            `}
                        >
                            {r === 'super_admin' ? 'مدير' : r === 'vendor' ? 'بائع' : 'مستخدم'}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
                <Button onClick={handleSave} disabled={loading}>
                    {loading ? 'جاري المعالجة...' : 'حفظ التغييرات'}
                </Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};
