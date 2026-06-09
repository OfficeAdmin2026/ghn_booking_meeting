import { useState, useEffect } from 'react';
import { adminApi } from '../api';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_RULES = `1. Đặt phòng đúng mục đích và đúng thời lượng thực tế cần sử dụng.
2. Có mặt tại phòng trong vòng 10 phút kể từ giờ đặt để check-in; nếu quá giờ, phòng sẽ tự động được giải phóng cho người khác.
3. Giữ gìn vệ sinh, sắp xếp bàn ghế và thiết bị ngăn nắp sau khi sử dụng.
4. Không ăn uống (trừ nước lọc) trong phòng họp.
5. Tắt đèn, điều hòa và các thiết bị điện khi rời phòng.
6. Báo cáo sự cố thiết bị kịp thời cho bộ phận quản lý.
7. Không tự ý di chuyển thiết bị ra khỏi phòng họp.
8. Ưu tiên hủy đặt phòng sớm nếu không còn nhu cầu để nhường cho đồng nghiệp.`;

export default function RulesPage() {
  const { isAdmin } = useAuth();
  const [rules, setRules] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminApi.getRules()
      .then((res) => setRules(res.data.data?.rules || ''))
      .catch(() => setRules(''))
      .finally(() => setLoading(false));
  }, []);

  const handleEdit = () => {
    setEditText(rules || DEFAULT_RULES);
    setError('');
    setSaved(false);
    setEditMode(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await adminApi.updateRules(editText);
      setRules(editText);
      setEditMode(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Lưu thất bại, vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const displayRules = rules || DEFAULT_RULES;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nội quy phòng họp</h1>
          <p className="text-sm text-gray-500 mt-1">Quy định sử dụng phòng họp tại GHN</p>
        </div>
        {isAdmin && !editMode && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-ghn-orange text-ghn-orange text-sm font-medium hover:bg-orange-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Chỉnh sửa
          </button>
        )}
      </div>

      {saved && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium">
          ✅ Đã lưu nội quy thành công.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-ghn-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : editMode ? (
        /* Edit mode */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <p className="text-xs text-gray-400">Nhập mỗi quy định trên một dòng. Hỗ trợ xuống hàng.</p>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={18}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 leading-relaxed resize-y focus:outline-none focus:border-ghn-orange font-mono"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-ghn-orange hover:bg-ghn-orange-dark text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : '💾 Lưu nội quy'}
            </button>
            <button
              onClick={() => setEditMode(false)}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      ) : (
        /* Display mode */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-ghn-orange to-ghn-orange-dark px-6 py-4">
            <p className="text-white text-sm font-semibold">
              📋 Vui lòng đọc kỹ và tuân thủ nội quy khi sử dụng phòng họp
            </p>
          </div>
          <div className="px-6 py-5">
            <div className="space-y-3">
              {displayRules.split('\n').filter((line) => line.trim()).map((line, idx) => (
                <div key={idx} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 text-ghn-orange text-[11px] font-bold flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {line.replace(/^\d+\.\s*/, '')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
