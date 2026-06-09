import { useState, useEffect } from 'react';
import { adminApi } from '../api';
import { useAuth } from '../contexts/AuthContext';

/* ── Section component ── */
const SECTION_STYLES = {
  orange: { header: 'bg-ghn-orange',  number: 'text-ghn-orange',  border: 'border-orange-200' },
  blue:   { header: 'bg-blue-500',    number: 'text-blue-500',    border: 'border-blue-200'   },
  red:    { header: 'bg-red-500',     number: 'text-red-500',     border: 'border-red-200'    },
};

function RulesSection({ color, icon, title, intro, items }) {
  const s = SECTION_STYLES[color];
  return (
    <div className={`rounded-xl overflow-hidden border ${s.border}`}>
      <div className={`${s.header} px-5 py-3 flex items-center gap-2`}>
        <span className="text-lg">{icon}</span>
        <span className="text-white font-bold text-sm uppercase tracking-wider">{title}</span>
      </div>
      <div className="px-5 py-4 space-y-3.5 bg-white">
        {intro && <p className="text-gray-500 text-sm italic mb-1">{intro}</p>}
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className={`${s.number} font-bold text-sm flex-shrink-0 w-4 text-right mt-0.5`}>{i + 1}.</span>
            <p className="text-gray-700 text-sm leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Default content (hard-coded, matches official rules) ── */
function DefaultRulesContent() {
  return (
    <>
      {/* Colorful top bar */}
      <div className="h-1.5 bg-gradient-to-r from-red-400 via-yellow-300 via-green-400 via-blue-400 to-purple-500" />

      {/* Header */}
      <div className="text-center px-6 pt-8 pb-6">
        <span className="inline-block bg-ghn-orange text-white text-[11px] font-bold px-5 py-1.5 rounded-full tracking-widest uppercase mb-4">
          Quy định nội bộ
        </span>
        <h1 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-wide leading-snug">
          Quy định về việc đăng ký và sử dụng phòng họp
        </h1>
        <div className="w-10 h-1 bg-ghn-orange mx-auto rounded-full mt-3" />
      </div>

      <div className="px-6 pb-8 space-y-6">
        {/* Intro */}
        <p className="text-gray-700 text-sm leading-relaxed">
          Để đảm bảo văn phòng <strong>"GHN"</strong> phục vụ hiệu quả các nhu cầu hội họp và làm
          việc rất khác nhau của anh chị em, Hành chính thân gửi đến mọi người một số quy định mới
          như sau:
        </p>

        {/* Section 1 */}
        <RulesSection
          color="orange"
          icon="🗓️"
          title="Quy định đăng ký phòng họp"
          items={[
            <>ACE chỉ dùng phòng họp để tổ chức các cuộc họp nội bộ, tiếp đối tác/ khách hàng, các cuộc phỏng vấn <strong>từ 3 người tham dự trở lên</strong>.</>,
            <>Vào <strong>16:00 giờ chiều thứ 6 hàng tuần</strong>, ACE cần đặt lịch sử dụng phòng họp thì đăng ký thông qua hệ thống đặt phòng online.</>,
            <>Mỗi bộ phận chỉ được đặt lịch sử dụng phòng họp trong vòng <strong>tối đa 1 tuần</strong> và hệ thống sẽ tự động xóa sạch dữ liệu đã đặt kéo dài hơn 1 tuần mà không báo trước.</>,
          ]}
        />

        {/* Section 2 */}
        <RulesSection
          color="blue"
          icon="👥"
          title="ACE nhắc nhở lẫn nhau"
          items={[
            'Bảo quản tài sản, trang thiết bị trong phòng họp.',
            'Giữ vệ sinh chung, không hút thuốc lá trong phòng họp.',
            'Không dùng tay, vật cứng chạm vào ống kính camera hoặc xoay camera.',
            'Tắt hết các thiết bị điện, trả lại hiện trạng như ban đầu, mang rác ra đúng nơi quy định sau khi dùng.',
          ]}
        />

        {/* Section 3 */}
        <RulesSection
          color="red"
          icon="⚡"
          title="Biện pháp chế tài"
          intro={'Đừng vi phạm các quy định "nhỏ xíu" nói trên nếu không muốn bị áp dụng biện pháp chế tài nhé:'}
          items={[
            <>ACE nào làm <strong>hư hỏng, mất mát tài sản</strong> được trang bị trong phòng sẽ <strong>bồi thường 100% giá trị thực tế</strong> tài sản đó (bao gồm thay mới và phí thi công).</>,
            <>Đặt lịch rồi lại không sử dụng mà ACE lại không hủy bỏ lịch đã đặt trên hệ thống thì hệ thống sẽ <strong>từ chối quyền đặt lịch phòng họp của cá nhân đó vĩnh viễn</strong>.</>,
            <>ACE sử dụng phòng họp không đúng mục đích như quy định thì <strong>ID người đặt sẽ bị khóa vĩnh viễn</strong>.</>,
          ]}
        />

        <hr className="border-dashed border-gray-200 my-2" />

        {/* Closing */}
        <div className="space-y-3 text-center">
          <p className="text-gray-700 text-sm leading-relaxed">
            Rất mong nhận được sự hợp tác tích cực của tất cả ACE về quy định sử dụng phòng họp.
            Hy vọng bất cứ ACE nào khi cần phòng họp đều có thể sắp xếp đặt lịch phù hợp, cùng
            nhau vui vẻ chia sẻ lại phòng họp cho những trường hợp cần thiết hơn mình.
          </p>
          <p className="text-gray-700 text-sm">Chân thành cảm ơn toàn thể ACE rất nhiều.</p>
          <p className="text-ghn-orange font-bold italic text-sm">— Đại Diện Office Admin Team</p>
        </div>
      </div>
    </>
  );
}

/* ── Main page ── */
export default function RulesPage() {
  const { isAdmin } = useAuth();
  const [customRules, setCustomRules] = useState(null); // null = not loaded yet
  const [editMode, setEditMode]       = useState(false);
  const [editText, setEditText]       = useState('');
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [saved, setSaved]             = useState(false);

  useEffect(() => {
    adminApi.getRules()
      .then((res) => setCustomRules(res.data.data?.rules || ''))
      .catch(() => setCustomRules(''))
      .finally(() => setLoading(false));
  }, []);

  const handleEdit = () => {
    setEditText(customRules || '');
    setError('');
    setSaved(false);
    setEditMode(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await adminApi.updateRules(editText);
      setCustomRules(editText);
      setEditMode(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Lưu thất bại, vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* Admin toolbar */}
      {isAdmin && !editMode && !loading && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-400">
            {customRules ? 'Đang hiển thị nội dung tùy chỉnh.' : 'Đang hiển thị nội dung mặc định.'}
          </p>
          <div className="flex items-center gap-2">
            {customRules && (
              <button
                onClick={async () => { await adminApi.updateRules(''); setCustomRules(''); setSaved(true); setTimeout(() => setSaved(false), 3000); }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded"
              >
                ↺ Khôi phục mặc định
              </button>
            )}
            <button
              onClick={handleEdit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-ghn-orange text-ghn-orange text-sm font-medium hover:bg-orange-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Tùy chỉnh nội dung
            </button>
          </div>
        </div>
      )}

      {saved && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium">
          ✅ Đã lưu thành công.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-6 h-6 border-2 border-ghn-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : editMode ? (
        /* ── Edit mode ── */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <h2 className="font-bold text-gray-800 mb-1">Tùy chỉnh nội dung nội quy</h2>
            <p className="text-xs text-gray-400">
              Nhập nội dung văn bản thuần túy. Để trống và lưu để quay về giao diện mặc định.
            </p>
          </div>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={16}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 leading-relaxed resize-y focus:outline-none focus:border-ghn-orange"
            placeholder="Nhập nội dung tùy chỉnh... (để trống để dùng nội dung mặc định)"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-ghn-orange hover:bg-ghn-orange-dark text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : '💾 Lưu nội dung'}
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
      ) : customRules ? (
        /* ── Custom content from DB ── */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="whitespace-pre-line text-sm text-gray-700 leading-relaxed">{customRules}</div>
        </div>
      ) : (
        /* ── Default beautiful layout ── */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <DefaultRulesContent />
        </div>
      )}
    </div>
  );
}
