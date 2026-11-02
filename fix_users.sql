USE itinerary_planner;
UPDATE users SET email_verified = 1, otp_code = NULL, otp_expiry = NULL, password = '$2b$12$whZ9Ft61pflMq1xRKfVHOOa1flYMjrMSpl.dxTnAdZ/PTwEQy5eJm' WHERE email = 'gamingpro7223@gmail.com';
SELECT user_id, email, password, email_verified, otp_code, otp_expiry FROM users WHERE email = 'gamingpro7223@gmail.com';
