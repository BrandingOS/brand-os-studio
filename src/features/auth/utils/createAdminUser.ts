import { supabase } from '@/integrations/supabase/client';

export const createAdminUser = async () => {
  try {
    // Create admin user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'admin@brandos.com',
      password: 'admin123',
      options: {
        data: {
          name: 'Admin User',
          is_admin: true
        }
      }
    });

    if (authError) {
      console.error('Failed to create admin user:', authError);
      return;
    }

    console.log('Admin user created successfully');
    console.log('Login credentials: admin@brandos.com / admin123');
    
    return authData;
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

// Auto-run on app start in development
if (import.meta.env.DEV) {
  createAdminUser();
}