import { useEffect, useRef, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector(`script[src="${GSI_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function LoginPage() {
  const { user, loginWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [scriptError, setScriptError] = useState(false);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (user || !GOOGLE_CLIENT_ID) return;

    let cancelled = false;

    const handleCredentialResponse = async (response) => {
      setError('');
      const result = await loginWithGoogle(response.credential);
      if (cancelled) return;
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message);
      }
    };

    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          hd: 'ghn.vn',
          use_fedcm_for_prompt: true,
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'signin_with',
          locale: 'vi',
        });
        // One Tap: tự nổi popup góc màn hình nếu trình duyệt đã có sẵn phiên Google
        window.google.accounts.id.prompt();
      })
      .catch(() => {
        if (!cancelled) setScriptError(true);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-ghn-blue-light via-white to-ghn-orange-light flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="card p-8 shadow-lg">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img src="/images/logo.png" alt="GHN" className="h-14 object-contain mb-4" />
            <h1 className="text-xl font-bold font-heading text-gray-800">Đặt phòng họp</h1>
            <p className="text-sm text-gray-500 mt-1">Hệ thống nội bộ GiaoHangNhanh</p>
          </div>

          <p className="text-center text-sm text-gray-500 mb-5">
            Đăng nhập bằng tài khoản Google công ty (@ghn.vn)
          </p>

          <div className="flex justify-center min-h-[44px]">
            {!GOOGLE_CLIENT_ID ? (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 text-center">
                Google Sign-In chưa được cấu hình. Vui lòng liên hệ quản trị viên.
              </div>
            ) : scriptError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 text-center">
                Không tải được Google Sign-In. Vui lòng kiểm tra kết nối mạng và thử lại.
              </div>
            ) : loading ? (
              <span className="flex items-center gap-2 text-gray-500 text-sm">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Đang đăng nhập...
              </span>
            ) : (
              <div ref={buttonRef} />
            )}
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
