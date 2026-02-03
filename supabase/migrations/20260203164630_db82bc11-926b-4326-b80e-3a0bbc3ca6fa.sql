-- Create profile for turkaykolus@hotmail.com
INSERT INTO public.profiles (user_id, first_name, last_name)
VALUES ('50b1191a-e34a-475e-899c-9e5c143717bc', 'Türkay', 'Külüş')
ON CONFLICT (user_id) DO NOTHING;