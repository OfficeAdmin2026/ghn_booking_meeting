import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.endsWith('@ghn.vn')) {
      setError('Vui lòng dùng email công ty @ghn.vn');
      return;
    }
    const result = await login(email, fullName);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email công ty
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="ten@ghn.vn"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Họ tên <span className="text-gray-400 font-normal">(tùy chọn - lần đầu đăng nhập)</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                placeholder="Nguyễn Văn A"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-base py-3"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang đăng nhập...
                </span>
              ) : 'Đăng nhập'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
