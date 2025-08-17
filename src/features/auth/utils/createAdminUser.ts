import { supabase } from '@/lib/supabase';

export const createAdminUser = async () => {
  try {
    // Check if admin user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'admin@brandos.com')
      .single();

    if (existingUser) {
      console.log('Admin user already exists');
      return;
    }

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