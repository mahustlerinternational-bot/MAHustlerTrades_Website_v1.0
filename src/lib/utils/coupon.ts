// src/lib/utils/coupon.ts
import { supabase } from '@/lib/supabase/client';
import type { CouponValidateResponse } from '@/types';

export async function validateCoupon(
  code: string,
  courseId: string,
  coursePrice: number
): Promise<CouponValidateResponse> {
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .single();

  if (error || !coupon) {
    return { valid: false, discount_type: 'percent', discount_value: 0, final_price: coursePrice, message: 'Invalid coupon code.' };
  }

  // Check expiry
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, discount_type: 'percent', discount_value: 0, final_price: coursePrice, message: 'This coupon has expired.' };
  }

  // Check usage limit
  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    return { valid: false, discount_type: 'percent', discount_value: 0, final_price: coursePrice, message: 'This coupon has reached its usage limit.' };
  }

  // Check course scope
  if (coupon.course_id && coupon.course_id !== courseId) {
    return { valid: false, discount_type: 'percent', discount_value: 0, final_price: coursePrice, message: 'This coupon is not valid for this course.' };
  }

  // Calculate final price
  let finalPrice = coursePrice;
  if (coupon.discount_type === 'full') {
    finalPrice = 0;
  } else if (coupon.discount_type === 'percent') {
    finalPrice = Math.max(0, coursePrice * (1 - coupon.discount_value / 100));
  } else if (coupon.discount_type === 'fixed') {
    finalPrice = Math.max(0, coursePrice - coupon.discount_value);
  }

  return {
    valid:          true,
    discount_type:  coupon.discount_type,
    discount_value: coupon.discount_value,
    final_price:    finalPrice,
    message:        coupon.discount_type === 'full' ? '🎉 Full access granted via coupon!' : `Coupon applied: $${(coursePrice - finalPrice).toFixed(2)} off`,
  };
}

// src/lib/utils/cn.ts — className utility
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
