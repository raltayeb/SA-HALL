
-- تحديث دالة إنشاء المستخدم للتعامل مع حالة الدفع وحدود الباقة الديناميكية
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_full_name TEXT;
    v_hall_limit INTEGER;
    v_service_limit INTEGER;
    v_payment_status TEXT;
    v_status TEXT;
BEGIN
  -- استخراج البيانات من الميتاداتا
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'user');
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', '');
  
  -- حدود الباقة
  BEGIN
    v_hall_limit := (new.raw_user_meta_data->>'hall_limit')::integer;
    v_service_limit := (new.raw_user_meta_data->>'service_limit')::integer;
  EXCEPTION WHEN OTHERS THEN
    v_hall_limit := 1;
    v_service_limit := 3;
  END;

  -- حالة الدفع
  v_payment_status := COALESCE(new.raw_user_meta_data->>'payment_status', 'unpaid');

  -- تحديد حالة الحساب
  -- البائع: إذا دفع أونلاين يصبح "مقبول" (أو يبقى "قيد الانتظار" حسب سياسة الإدارة)، إذا كاش يصبح "قيد الانتظار"
  IF v_role = 'vendor' THEN
     IF v_payment_status = 'paid' THEN
        v_status := 'approved'; -- تفعيل فوري عند الدفع (يمكن تغييرها لـ pending للمراجعة)
     ELSE
        v_status := 'pending';
     END IF;
  ELSE
     v_status := 'approved'; -- المستخدم العادي
  END IF;

  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    status, 
    is_enabled, 
    business_name,
    hall_limit,
    service_limit,
    subscription_plan,
    payment_status
  )
  VALUES (
    new.id, 
    new.email, 
    v_full_name, 
    v_role,
    v_status,
    true,
    v_full_name,
    COALESCE(v_hall_limit, 1),
    COALESCE(v_service_limit, 3),
    'custom',
    v_payment_status
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    hall_limit = EXCLUDED.hall_limit,
    service_limit = EXCLUDED.service_limit,
    payment_status = EXCLUDED.payment_status,
    updated_at = NOW();
    
  RETURN new;
END;
$$;
