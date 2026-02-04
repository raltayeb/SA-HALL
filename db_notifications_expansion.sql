
-- ==========================================
-- SA Hall Notifications Triggers
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. BOOKING NOTIFICATIONS (Status Changes)
DROP TRIGGER IF EXISTS on_booking_update_notify ON public.bookings;
DROP FUNCTION IF EXISTS public.notify_booking_changes();

CREATE OR REPLACE FUNCTION public.notify_booking_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Scenario A: Booking Confirmed -> Notify User
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      'تم تأكيد الحجز ✅',
      'تمت الموافقة على طلب الحجز الخاص بك في ' || (SELECT name FROM public.halls WHERE id = NEW.hall_id LIMIT 1),
      'booking_update',
      'my_bookings'
    );
  END IF;

  -- Scenario B: Booking Cancelled -> Notify User
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      'تم إلغاء الحجز ❌',
      'عذراً، تم إلغاء طلب الحجز الخاص بك.',
      'booking_update',
      'my_bookings'
    );
  END IF;

  -- Scenario C: Payment Completed -> Notify Vendor
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.vendor_id,
      'تم استلام دفعة مالية 💰',
      'قام العميل بدفع قيمة الحجز بالكامل.',
      'payment',
      'hall_bookings'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_booking_update_notify
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE PROCEDURE public.notify_booking_changes();


-- 2. VENDOR ACCOUNT NOTIFICATIONS (Admin Actions)
DROP TRIGGER IF EXISTS on_profile_update_notify ON public.profiles;
DROP FUNCTION IF EXISTS public.notify_profile_changes();

CREATE OR REPLACE FUNCTION public.notify_profile_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Vendor Approved
  IF OLD.status = 'pending' AND NEW.status = 'approved' AND NEW.role = 'vendor' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.id,
      'تم تفعيل حسابك 🎉',
      'مبروك! تم اعتماد حساب البائع الخاص بك، يمكنك الآن إضافة قاعاتك.',
      'system',
      'dashboard'
    );
  END IF;

  -- Vendor Rejected
  IF OLD.status = 'pending' AND NEW.status = 'rejected' AND NEW.role = 'vendor' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.id,
      'تحديث بخصوص حسابك',
      'عذراً، لم يتم قبول طلب الانضمام كبائع في الوقت الحالي.',
      'system',
      'home'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_update_notify
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.notify_profile_changes();


-- 3. UPGRADE REQUEST NOTIFICATIONS
DROP TRIGGER IF EXISTS on_upgrade_update_notify ON public.upgrade_requests;
DROP FUNCTION IF EXISTS public.notify_upgrade_changes();

CREATE OR REPLACE FUNCTION public.notify_upgrade_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Request Approved
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.vendor_id,
      'تمت الموافقة على الترقية 🚀',
      'وافقت الإدارة على طلب زيادة السعة الخاص بك.',
      'system',
      NEW.request_type || 's' -- e.g., 'halls' or 'services' mapped to routes manually later if needed, mostly informational
    );
  END IF;

  -- Request Rejected
  IF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.vendor_id,
      'رفض طلب الترقية',
      'نعتذر، لم يتم قبول طلب الترقية الخاص بك.',
      'system',
      'dashboard'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_upgrade_update_notify
  AFTER UPDATE ON public.upgrade_requests
  FOR EACH ROW EXECUTE PROCEDURE public.notify_upgrade_changes();


-- 4. NEW VENDOR ALERT (Notify Admins)
DROP TRIGGER IF EXISTS on_vendor_signup_notify ON public.profiles;
DROP FUNCTION IF EXISTS public.notify_admins_new_vendor();

CREATE OR REPLACE FUNCTION public.notify_admins_new_vendor()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  admin_rec RECORD;
BEGIN
  -- Only trigger if new user is a vendor
  IF NEW.role = 'vendor' THEN
    -- Loop through all super_admins
    FOR admin_rec IN SELECT id FROM public.profiles WHERE role = 'super_admin'
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        admin_rec.id,
        'بائع جديد بانتظار الموافقة 👨‍💼',
        'قام ' || NEW.business_name || ' بالتسجيل في المنصة.',
        'system',
        'subscriptions'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_vendor_signup_notify
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.notify_admins_new_vendor();


-- 5. UPGRADE REQUEST ALERT (Notify Admins)
DROP TRIGGER IF EXISTS on_upgrade_insert_notify ON public.upgrade_requests;
DROP FUNCTION IF EXISTS public.notify_admins_upgrade();

CREATE OR REPLACE FUNCTION public.notify_admins_upgrade()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  admin_rec RECORD;
  v_vendor_name TEXT;
BEGIN
  SELECT business_name INTO v_vendor_name FROM public.profiles WHERE id = NEW.vendor_id;

  FOR admin_rec IN SELECT id FROM public.profiles WHERE role = 'super_admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      admin_rec.id,
      'طلب ترقية جديد 📈',
      'طلب ' || COALESCE(v_vendor_name, 'بائع') || ' زيادة سعة ' || NEW.request_type,
      'system',
      'admin_requests'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_upgrade_insert_notify
  AFTER INSERT ON public.upgrade_requests
  FOR EACH ROW EXECUTE PROCEDURE public.notify_admins_upgrade();
