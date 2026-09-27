-- The phone number and the free-text message a customer types in the wizard.
--
-- Both were sent to Clément's inbox and then dropped: the booking row never
-- kept them. The admin dashboard now lists bookings with a way to reach the
-- customer, and confirms private requests from the page — so it needs what
-- the customer wrote, not just their name.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_message TEXT;

-- When a private request was turned into a confirmed booking from the admin.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
