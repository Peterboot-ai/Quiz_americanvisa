import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@getmocha/users-service/react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { exchangeCodeForSessionToken } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await exchangeCodeForSessionToken();
        navigate('/admin');
      } catch (error) {
        console.error('Error during authentication:', error);
        navigate('/admin');
      }
    };

    handleCallback();
  }, [exchangeCodeForSessionToken, navigate]);

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
