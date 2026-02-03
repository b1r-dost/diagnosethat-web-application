-- Add admin and dentist roles to turkaykolus@hotmail.com
INSERT INTO public.user_roles (user_id, role) 
VALUES 
  ('50b1191a-e34a-475e-899c-9e5c143717bc', 'admin'),
  ('50b1191a-e34a-475e-899c-9e5c143717bc', 'dentist')
ON CONFLICT (user_id, role) DO NOTHING;