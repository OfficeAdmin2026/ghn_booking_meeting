import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/** Backend redirect trình duyệt về đây sau khi SSO login xong, kèm ?token=... (thành công)
 * hoặc ?error=... (thất bại). Trang này chỉ có nhiệm vụ lưu token rồi vào app, hoặc hiện lỗi. */
export default function SsoCompletePage() {
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(searchParams.get('error') || '');
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const token = searchParams.get('token');
    if (!token) return; // error case, đã set ở state ban đầu

    loginWithToken(token).then((result) => {
      if (result.success) {
        navigate('/', { replace: true });
      } else {
        setError(result.message);
      }
    });
  }, [searchParams, loginWithToken, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-ghn-blue-light via-white to-ghn-orange-light flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-lg text-center">
          <img src="/images/logo.png" alt="GHN" className="h-14 object-contain mb-4 mx-auto" />
          {error ? (
            <>
              <p className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-4">
                {error}
              </p>
              <a href="/login" className="btn-primary w-full text-base py-3 inline-block">
                Quay lại đăng nhập
              </a>
            </>
          ) : (
            <p className="text-sm text-gray-500">Đang hoàn tất đăng nhập...</p>
          )}
        </div>
      </div>
    </div>
  );
}
