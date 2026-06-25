import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/admin');
      } else {
        // Exchange the code from the URL for a session
        supabase.auth.exchangeCodeForSession(window.location.href).then(() => {
          navigate('/admin');
        }).catch(() => {
          navigate('/admin');
        });
      }
    });
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
