import { useState, useEffect } from 'react';
import { adminApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import {
  QuestionMarkCircleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BookmarkIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

/* ─── Default content ─── */
const DEFAULT_TOPICS = [
  {
    id: 't1', icon: '🔑', title: 'Đăng nhập',
    items: [
      'Truy cập web, nhập **email công ty (@ghn.vn)** và họ tên — không cần mật khẩu.',
      'Lần đầu đăng nhập, hệ thống tự động tạo tài khoản với quyền **User**. Muốn nâng quyền VIP/Admin, liên hệ bộ phận quản trị.',
    ],
  },
  {
    id: 't2', icon: '📅', title: 'Đặt phòng họp',
    items: [
      'Vào **Trang chủ**, chọn địa điểm (Rivera Park / Mipec) và tầng ở bộ lọc bên trái để xem lịch các phòng.',
      'Trên lịch, **kéo chọn khung giờ trống** của phòng cần đặt, nhập tiêu đề cuộc họp rồi bấm Đặt phòng.',
      'Không nhớ phòng nào trống? Dùng ô **Tìm phòng trống** để lọc theo sức chứa, tiện ích (TV, Video Conference...).',
      'Muốn đổi giờ hoặc huỷ lịch đã đặt, bấm vào lịch đó trên calendar để mở chi tiết.',
      'Phòng có gắn nhãn **VIP** chỉ dành cho Ban điều hành (BOD) sử dụng.',
    ],
  },
  {
    id: 't3', icon: '⏰', title: 'Quy tắc mở lịch theo tuần',
    items: [
      'Lịch đặt phòng chỉ mở theo tuần, thường vào **chiều Thứ 5** hàng tuần cho tuần kế tiếp (tuỳ cấu hình admin).',
      'Nếu chọn khung giờ ở tuần chưa mở, hệ thống sẽ báo "chưa thể đặt phòng" kèm thời điểm mở tiếp theo.',
    ],
  },
  {
    id: 't4', icon: '🗺️', title: 'Bản đồ văn phòng',
    items: [
      'Vào mục **Bản đồ văn phòng** để xem sơ đồ trực quan, tìm phòng theo tên hoặc vị trí trên từng tầng.',
      'Bấm vào một phòng trên bản đồ để xem thông tin và đặt phòng nhanh.',
    ],
  },
  {
    id: 't5', icon: '🚗', title: 'Xe công ty',
    items: [
      'Vào mục **Xe công ty** để xem lịch trống của các xe trong tuần.',
      'Hệ thống hiện chỉ cho **Admin đặt xe hộ** — thấy khung giờ trống thì nhắn Admin để được sắp xếp.',
    ],
  },
  {
    id: 't6', icon: '💬', title: 'Hỗ trợ',
    items: [
      'Xem thêm mục **Nội quy phòng họp** để nắm các quy định sử dụng phòng.',
      'Có thắc mắc hoặc gặp lỗi khi sử dụng hệ thống, vui lòng liên hệ bộ phận Hành chính / Admin để được hỗ trợ.',
    ],
  },
];

/* ─── **bold** renderer ─── */
function T({ text }) {
  if (!text) return null;
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return <>{parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)}</>;
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ghn-orange';

/* ─── Edit form for the currently selected topic ─── */
function TopicEditForm({ topic, onChange, onSave, onCancel, saving }) {
  const setField = (f, v) => onChange({ ...topic, [f]: v });
  const setItem = (i, v) => { const a = [...topic.items]; a[i] = v; onChange({ ...topic, items: a }); };
  const addItem = () => onChange({ ...topic, items: [...topic.items, ''] });
  const delItem = (i) => onChange({ ...topic, items: topic.items.filter((_, j) => j !== i) });
  const moveUp = (i) => { if (i === 0) return; const a = [...topic.items]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; onChange({ ...topic, items: a }); };
  const moveDown = (i) => { if (i >= topic.items.length - 1) return; const a = [...topic.items]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; onChange({ ...topic, items: a }); };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[80px_1fr] gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Icon</label>
          <input value={topic.icon} onChange={(e) => setField('icon', e.target.value)} className={inputCls} placeholder="📌" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Tiêu đề mục</label>
          <input value={topic.title} onChange={(e) => setField('title', e.target.value)} className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Nội dung <span className="normal-case font-normal text-gray-300 ml-1">· bọc **...** để in đậm</span>
        </label>
        <div className="space-y-2">
          {topic.items.map((item, i) => (
            <div key={i} className="flex gap-1.5 items-start">
              <textarea value={item} onChange={(e) => setItem(i, e.target.value)} rows={2} className={`flex-1 ${inputCls} resize-none`} />
              <div className="flex flex-col gap-0.5 flex-shrink-0 mt-0.5">
                <button type="button" onClick={() => moveUp(i)} disabled={i === 0}
                  className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                  <ArrowUpIcon className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => moveDown(i)} disabled={i === topic.items.length - 1}
                  className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                  <ArrowDownIcon className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => delItem(i)}
                  className="w-6 h-6 flex items-center justify-center rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addItem}
          className="mt-2 text-xs text-ghn-orange hover:text-ghn-orange-dark font-semibold inline-flex items-center gap-1 transition-colors">
          <PlusIcon className="w-3.5 h-3.5" /> Thêm nội dung
        </button>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onSave} disabled={saving} className="btn-primary px-5 py-2 inline-flex items-center gap-1.5">
          {saving ? 'Đang lưu...' : (<><BookmarkIcon className="w-4 h-4" /> Lưu</>)}
        </button>
        <button onClick={onCancel} disabled={saving} className="btn-ghost px-5 py-2">Hủy</button>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function GuidePage() {
  const { isAdmin } = useAuth();
  const [topics, setTopics] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getGuide()
      .then((res) => {
        const raw = res.data.data?.guide || '';
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch { /* fall back below */ }
        const list = Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_TOPICS;
        setTopics(list);
        setSelectedId(list[0].id);
      })
      .catch(() => { setTopics(DEFAULT_TOPICS); setSelectedId(DEFAULT_TOPICS[0].id); })
      .finally(() => setLoading(false));
  }, []);

  const persist = async (newTopics, keepSelected) => {
    setSaving(true);
    setError('');
    try {
      await adminApi.updateGuide(JSON.stringify(newTopics));
      setTopics(newTopics);
      if (keepSelected !== undefined) setSelectedId(keepSelected);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Lưu thất bại, vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = () => { setDraft({ ...selectedTopic }); setEditMode(true); };
  const cancelEdit = () => { setDraft(null); setEditMode(false); };
  const saveEdit = () => {
    const newTopics = topics.map((t) => (t.id === draft.id ? draft : t));
    persist(newTopics).then(() => { setDraft(null); setEditMode(false); });
  };

  const addTopic = () => {
    const t = { id: `t${Date.now()}`, icon: '📌', title: 'Mục mới', items: [''] };
    const newTopics = [...topics, t];
    persist(newTopics, t.id).then(() => { setDraft(t); setEditMode(true); });
  };

  const deleteTopic = (id) => {
    if (!window.confirm('Xoá mục này?')) return;
    const newTopics = topics.filter((t) => t.id !== id);
    if (newTopics.length === 0) return;
    const nextSelected = selectedId === id ? newTopics[0].id : selectedId;
    persist(newTopics, nextSelected);
  };

  if (loading || !topics) return (
    <div className="flex justify-center py-24">
      <div className="w-6 h-6 border-2 border-ghn-orange border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const selectedTopic = topics.find((t) => t.id === selectedId) || topics[0];

  return (
    <div className="p-4">
      <div className="flex gap-6 items-start">
        {/* Sidebar */}
        <div className="w-64 shrink-0 rounded-xl border border-gray-200 bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700 inline-flex items-center gap-1.5">
              <QuestionMarkCircleIcon className="w-4 h-4 text-ghn-orange" /> Hướng dẫn sử dụng
            </h3>
            {isAdmin && (
              <button type="button" onClick={addTopic} title="Thêm mục" className="text-gray-400 hover:text-ghn-orange transition-colors">
                <PlusIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            {topics.map((t) => (
              <div
                key={t.id}
                onClick={() => { setSelectedId(t.id); setEditMode(false); }}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors ${
                  selectedId === t.id ? 'bg-orange-50 border border-ghn-orange/40' : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <span className="text-base shrink-0">{t.icon}</span>
                <p className="min-w-0 flex-1 text-sm font-medium text-gray-800 truncate">{t.title}</p>
                {isAdmin && topics.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteTopic(t.id); }}
                    className="shrink-0 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-white p-6">
          {saved && (
            <div className="mb-4 px-4 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium inline-flex items-center gap-1.5">
              <CheckCircleIcon className="w-4 h-4" /> Đã lưu thành công.
            </div>
          )}
          {error && <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          {editMode ? (
            <TopicEditForm topic={draft} onChange={setDraft} onSave={saveEdit} onCancel={cancelEdit} saving={saving} />
          ) : (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900 inline-flex items-center gap-2">
                  <span className="text-xl">{selectedTopic.icon}</span> {selectedTopic.title}
                </h2>
                {isAdmin && (
                  <button onClick={startEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-ghn-orange hover:bg-orange-50 transition-colors">
                    <PencilIcon className="w-3.5 h-3.5" /> Chỉnh sửa
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {selectedTopic.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-ghn-orange font-bold text-sm flex-shrink-0 w-5 text-right mt-0.5">{i + 1}.</span>
                    <p className="text-gray-700 text-sm leading-relaxed"><T text={item} /></p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
