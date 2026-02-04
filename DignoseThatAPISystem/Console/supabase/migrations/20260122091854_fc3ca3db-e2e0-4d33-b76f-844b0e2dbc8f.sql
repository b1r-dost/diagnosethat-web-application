-- Assign admin role to existing user
INSERT INTO public.user_roles (user_id, role)
VALUES ('b9ee8998-e81f-43c2-a708-33ec0f30af2f', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;