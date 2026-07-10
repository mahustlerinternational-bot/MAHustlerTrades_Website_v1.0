-- ============================================================
-- MAHustler Trades — RPC Helper Functions
-- Migration: 002_rpc_helpers
-- ============================================================

-- Atomically increment coupon uses_count, respecting max_uses
CREATE OR REPLACE FUNCTION increment_coupon_uses(
  p_coupon_id UUID,
  p_max_uses  INT
)
RETURNS VOID AS $$
BEGIN
  UPDATE coupons
  SET    uses_count = uses_count + 1
  WHERE  id         = p_coupon_id
    AND  is_active  = TRUE
    AND  (p_max_uses IS NULL OR uses_count < p_max_uses);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coupon limit reached or coupon inactive';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomically increment event registered_count
CREATE OR REPLACE FUNCTION increment_event_count(p_event_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE events
  SET    registered_count = registered_count + 1
  WHERE  id               = p_event_id
    AND  (capacity IS NULL OR registered_count < capacity);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event is at full capacity';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement event count on cancellation
CREATE OR REPLACE FUNCTION decrement_event_count(p_event_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE events
  SET    registered_count = GREATEST(0, registered_count - 1)
  WHERE  id               = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get member dashboard summary (single round-trip)
CREATE OR REPLACE FUNCTION get_member_summary(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_enrollments INT;
  v_events      INT;
  v_ib_status   ib_status;
BEGIN
  SELECT COUNT(*) INTO v_enrollments
  FROM   enrollments
  WHERE  user_id = p_user_id AND status = 'active';

  SELECT COUNT(*) INTO v_events
  FROM   event_registrations er
  JOIN   events e ON e.id = er.event_id
  WHERE  er.user_id = p_user_id
    AND  er.status  = 'confirmed'
    AND  e.event_date > NOW();

  SELECT ib_status INTO v_ib_status
  FROM   profiles
  WHERE  id = p_user_id;

  RETURN json_build_object(
    'enrolled_courses', v_enrollments,
    'upcoming_events',  v_events,
    'ib_status',        v_ib_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Supabase Realtime for quant tables
ALTER PUBLICATION supabase_realtime ADD TABLE quant_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE quant_regimes;
