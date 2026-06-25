import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/react-app/lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const redirectTo = sessionStorage.getItem('auth_redirect') || '/admin';

    const finish = () => {
      sessionStorage.removeItem('auth_redirect');
      navigate(redirectTo);
    };

    // Listen for auth state change (handles both implicit and PKCE flows)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe();
        finish();
      }
    });

    // Fallback: if session already exists (e.g. page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        finish();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#F0EDE8] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B2541] mx-auto mb-4"></div>
        <p className="text-[#5C5A65]">Autenticando...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
