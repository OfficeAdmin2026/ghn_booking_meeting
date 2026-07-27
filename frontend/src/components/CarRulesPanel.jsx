import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { ClipboardDocumentListIcon, PencilIcon, CheckIcon } from '@heroicons/react/24/outline';

/** Renderer nhỏ hỗ trợ **bold** (cùng convention với RulesPage.jsx) */
function Bold({ text }) {
  if (!text) return null;
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return <>{parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p))}</>;
}

export default function CarRulesPanel() {
  const { isAdmin } = useAuth();
  const [rules, setRules] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getCarRules()
      .then((res) => setRules(res.data.data?.rules || ''))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleEdit = () => { setDraft(rules); setEditing(true); };
  const handleCancel = () => setEditing(false);
  const handleSave = () => {
    setSaving(true);
    adminApi.updateCarRules(draft)
      .then(() => { setRules(draft); setEditing(false); })
      .catch(() => {})
      .finally(() => setSaving(false));
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
        <h3 className="text-sm font-semibold text-gray-700 inline-flex items-center gap-1.5">
          <ClipboardDocumentListIcon className="w-4 h-4 text-ghn-orange" /> Nội quy đặt xe
        </h3>
        {isAdmin && !editing && (
          <button type="button" onClick={handleEdit} className="text-gray-400 hover:text-ghn-orange transition-colors">
            <PencilIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-gray-400">Đang tải...</p>
      ) : editing ? (
        <div className="space-y-2 min-h-0 flex-1 flex flex-col">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full flex-1 min-h-[160px] text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-ghn-orange"
            placeholder="VD: Chỉ đăng ký sử dụng xe cho công việc chung. Nhắn Admin để đặt xe khi thấy khung giờ trống..."
          />
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-semibold text-white bg-ghn-orange rounded-lg px-3 py-1.5 hover:bg-ghn-orange-dark disabled:opacity-40 transition-colors">
              <CheckIcon className="w-3.5 h-3.5" /> {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button type="button" onClick={handleCancel}
              className="flex-1 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
              Huỷ
            </button>
          </div>
        </div>
      ) : rules ? (
        <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed overflow-y-auto">
          <Bold text={rules} />
        </div>
      ) : (
        <p className="text-xs text-gray-400">
          {isAdmin ? 'Chưa có nội quy — bấm biểu tượng bút để thêm.' : 'Chưa có nội quy được thiết lập.'}
        </p>
      )}
    </div>
  );
}
