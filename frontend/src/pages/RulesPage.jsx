import { useState, useEffect } from 'react';
import { adminApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import {
  GlobeAltIcon,
  PencilIcon,
  PencilSquareIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  TrashIcon,
  PlusIcon,
  ArrowUturnLeftIcon,
  BookmarkIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

/* ─── Color palette ─── */
const COLORS = {
  orange: { header: 'bg-ghn-orange', num: 'text-ghn-orange', border: 'border-orange-200', dot: 'bg-ghn-orange',  label: 'Cam'      },
  blue:   { header: 'bg-blue-500',   num: 'text-blue-500',   border: 'border-blue-200',   dot: 'bg-blue-500',   label: 'Xanh'     },
  red:    { header: 'bg-red-500',    num: 'text-red-500',    border: 'border-red-200',    dot: 'bg-red-500',    label: 'Đỏ'       },
  green:  { header: 'bg-green-600',  num: 'text-green-600',  border: 'border-green-200',  dot: 'bg-green-600',  label: 'Xanh lá'  },
  purple: { header: 'bg-purple-500', num: 'text-purple-500', border: 'border-purple-200', dot: 'bg-purple-500', label: 'Tím'      },
};

/* ─── Default content ─── */
const DEFAULT_DATA = {
  badge: 'Quy định nội bộ',
  title: 'Quy định về việc đăng ký và sử dụng phòng họp',
  intro: 'Để đảm bảo văn phòng "GHN" phục vụ hiệu quả các nhu cầu hội họp và làm việc rất khác nhau của anh chị em, Hành chính thân gửi đến mọi người một số quy định mới như sau:',
  sections: [
    {
      id: 's1', color: 'orange', icon: '🗓️', title: 'Quy định đăng ký phòng họp', intro: '',
      items: [
        'ACE chỉ dùng phòng họp để tổ chức các cuộc họp nội bộ, tiếp đối tác/ khách hàng, các cuộc phỏng vấn **từ 3 người tham dự trở lên**.',
        'Vào **16:00 giờ chiều thứ 6 hàng tuần**, ACE cần đặt lịch sử dụng phòng họp thì đăng ký thông qua hệ thống đặt phòng online.',
        'Mỗi bộ phận chỉ được đặt lịch sử dụng phòng họp trong vòng **tối đa 1 tuần** và hệ thống sẽ tự động xóa sạch dữ liệu đã đặt kéo dài hơn 1 tuần mà không báo trước.',
      ],
    },
    {
      id: 's2', color: 'blue', icon: '👥', title: 'ACE nhắc nhở lẫn nhau', intro: '',
      items: [
        'Bảo quản tài sản, trang thiết bị trong phòng họp.',
        'Giữ vệ sinh chung, không hút thuốc lá trong phòng họp.',
        'Không dùng tay, vật cứng chạm vào ống kính camera hoặc xoay camera.',
        'Tắt hết các thiết bị điện, trả lại hiện trạng như ban đầu, mang rác ra đúng nơi quy định sau khi dùng.',
      ],
    },
    {
      id: 's3', color: 'red', icon: '⚡', title: 'Biện pháp chế tài',
      intro: 'Đừng vi phạm các quy định "nhỏ xíu" nói trên nếu không muốn bị áp dụng biện pháp chế tài nhé:',
      items: [
        'ACE nào làm **hư hỏng, mất mát tài sản** được trang bị trong phòng sẽ **bồi thường 100% giá trị thực tế** tài sản đó (bao gồm thay mới và phí thi công).',
        'Đặt lịch rồi lại không sử dụng mà ACE lại không hủy bỏ lịch đã đặt trên hệ thống thì hệ thống sẽ **từ chối quyền đặt lịch phòng họp của cá nhân đó vĩnh viễn**.',
        'ACE sử dụng phòng họp không đúng mục đích như quy định thì **ID người đặt sẽ bị khóa vĩnh viễn**.',
      ],
    },
  ],
  closing: {
    paragraphs: [
      'Rất mong nhận được sự hợp tác tích cực của tất cả ACE về quy định sử dụng phòng họp. Hy vọng bất cứ ACE nào khi cần phòng họp đều có thể sắp xếp đặt lịch phù hợp, cùng nhau vui vẻ chia sẻ lại phòng họp cho những trường hợp cần thiết hơn mình.',
      'Chân thành cảm ơn toàn thể ACE rất nhiều.',
    ],
    signature: '— Đại Diện Office Admin Team',
  },
};

/* ─── **bold** renderer ─── */
function T({ text }) {
  if (!text) return null;
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return <>{parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)}</>;
}

/* ─── Display: one section ─── */
function SectionDisplay({ s }) {
  const c = COLORS[s.color] || COLORS.orange;
  return (
    <div className={`rounded-xl overflow-hidden border ${c.border}`}>
      <div className={`${c.header} px-5 py-3 flex items-center gap-2`}>
        <span className="text-lg">{s.icon}</span>
        <span className="text-white font-bold text-sm uppercase tracking-wider">{s.title}</span>
      </div>
      <div className="px-5 py-4 space-y-3.5 bg-white">
        {s.intro && <p className="text-gray-500 text-sm italic">{s.intro}</p>}
        {s.items.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className={`${c.num} font-bold text-sm flex-shrink-0 w-5 text-right mt-0.5`}>{i + 1}.</span>
            <p className="text-gray-700 text-sm leading-relaxed"><T text={item} /></p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Display: full page ─── */
function RulesDisplay({ data }) {
  return (
    <>
      <div className="h-1.5 bg-gradient-to-r from-red-400 via-yellow-300 via-green-400 via-blue-400 to-purple-500" />
      <div className="text-center px-6 pt-8 pb-6">
        <span className="inline-block bg-ghn-orange text-white text-[11px] font-bold px-5 py-1.5 rounded-full tracking-widest uppercase mb-4">
          {data.badge}
        </span>
        <h1 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-wide leading-snug">
          {data.title}
        </h1>
        <div className="w-10 h-1 bg-ghn-orange mx-auto rounded-full mt-3" />
      </div>
      <div className="px-6 pb-8 space-y-6">
        {data.intro && <p className="text-gray-700 text-sm leading-relaxed"><T text={data.intro} /></p>}
        {data.sections.map((s) => <SectionDisplay key={s.id} s={s} />)}
        <hr className="border-dashed border-gray-200" />
        <div className="space-y-3 text-center">
          {data.closing.paragraphs.map((p, i) => (
            <p key={i} className="text-gray-700 text-sm leading-relaxed">{p}</p>
          ))}
          {data.closing.signature && (
            <p className="text-ghn-orange font-bold italic text-sm">{data.closing.signature}</p>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Reusable field label ─── */
function FieldLabel({ children, hint }) {
  return (
    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
      {children}
      {hint && <span className="normal-case font-normal tracking-normal text-gray-300 ml-1">{hint}</span>}
    </label>
  );
}

/* ─── Collapsible card ─── */
function Card({ title, colorDot, open, onToggle, actions, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 min-w-0">
          {colorDot && <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorDot}`} />}
          <span className="text-sm font-semibold text-gray-800 truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
          {actions}
          <svg className={`w-4 h-4 text-gray-400 transition-transform ml-1 ${open ? '' : '-rotate-90'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {open && <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3">{children}</div>}
    </div>
  );
}

/* ─── Icon button ─── */
function IconBtn({ onClick, danger, disabled, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors text-sm disabled:opacity-30
        ${danger ? 'text-red-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {children}
    </button>
  );
}

/* ─── Input/Textarea helpers ─── */
const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ghn-orange';

/* ─── Edit form ─── */
function EditForm({ initial, onSave, onCancel, saving }) {
  const [d, setD] = useState(() => JSON.parse(JSON.stringify(initial)));
  const [openCards, setOpenCards] = useState({ overview: true });

  const toggleCard = (id) => setOpenCards((v) => ({ ...v, [id]: !v[id] }));

  /* global fields */
  const setField = (f, v) => setD((p) => ({ ...p, [f]: v }));

  /* closing */
  const setClosingField = (f, v) => setD((p) => ({ ...p, closing: { ...p.closing, [f]: v } }));
  const setClosingPara  = (i, v) => setD((p) => { const a = [...p.closing.paragraphs]; a[i] = v; return { ...p, closing: { ...p.closing, paragraphs: a } }; });
  const addClosingPara  = ()      => setD((p) => ({ ...p, closing: { ...p.closing, paragraphs: [...p.closing.paragraphs, ''] } }));
  const delClosingPara  = (i)     => setD((p) => ({ ...p, closing: { ...p.closing, paragraphs: p.closing.paragraphs.filter((_, j) => j !== i) } }));

  /* sections */
  const setSection      = (id, f, v)  => setD((p) => ({ ...p, sections: p.sections.map((s) => s.id === id ? { ...s, [f]: v } : s) }));
  const addSection      = ()          => setD((p) => ({ ...p, sections: [...p.sections, { id: `s${Date.now()}`, color: 'orange', icon: '📌', title: 'Mục mới', intro: '', items: [''] }] }));
  const delSection      = (id)        => setD((p) => ({ ...p, sections: p.sections.filter((s) => s.id !== id) }));
  const moveSectionUp   = (i)         => { if (i === 0) return; setD((p) => { const a = [...p.sections]; [a[i-1], a[i]] = [a[i], a[i-1]]; return { ...p, sections: a }; }); };
  const moveSectionDown = (i)         => setD((p) => { if (i >= p.sections.length - 1) return p; const a = [...p.sections]; [a[i], a[i+1]] = [a[i+1], a[i]]; return { ...p, sections: a }; });

  /* items */
  const setItem = (sid, i, v) => setD((p) => ({ ...p, sections: p.sections.map((s) => { if (s.id !== sid) return s; const a = [...s.items]; a[i] = v; return { ...s, items: a }; }) }));
  const addItem = (sid)       => setD((p) => ({ ...p, sections: p.sections.map((s) => s.id === sid ? { ...s, items: [...s.items, ''] } : s) }));
  const delItem = (sid, i)    => setD((p) => ({ ...p, sections: p.sections.map((s) => s.id === sid ? { ...s, items: s.items.filter((_, j) => j !== i) } : s) }));
  const moveItemUp   = (sid, i) => { if (i === 0) return; setD((p) => ({ ...p, sections: p.sections.map((s) => { if (s.id !== sid) return s; const a = [...s.items]; [a[i-1], a[i]] = [a[i], a[i-1]]; return { ...s, items: a }; }) })); };
  const moveItemDown = (sid, i) => setD((p) => ({ ...p, sections: p.sections.map((s) => { if (s.id !== sid) return s; if (i >= s.items.length - 1) return s; const a = [...s.items]; [a[i], a[i+1]] = [a[i+1], a[i]]; return { ...s, items: a }; }) }));

  return (
    <div className="space-y-3">

      {/* ── Overview ── */}
      <Card title={<span className="flex items-center gap-1.5"><GlobeAltIcon className="w-4 h-4" /> Tổng quan</span>} open={!!openCards.overview} onToggle={() => toggleCard('overview')}>
        <div>
          <FieldLabel>Nhãn badge</FieldLabel>
          <input value={d.badge} onChange={(e) => setField('badge', e.target.value)} className={inputCls} placeholder="Quy định nội bộ" />
        </div>
        <div>
          <FieldLabel>Tiêu đề chính</FieldLabel>
          <input value={d.title} onChange={(e) => setField('title', e.target.value)} className={inputCls} />
        </div>
        <div>
          <FieldLabel>Đoạn giới thiệu</FieldLabel>
          <textarea value={d.intro} onChange={(e) => setField('intro', e.target.value)} rows={3} className={`${inputCls} resize-none`} />
        </div>
      </Card>

      {/* ── Sections ── */}
      {d.sections.map((s, idx) => {
        const c = COLORS[s.color] || COLORS.orange;
        const cardId = `sec_${s.id}`;
        return (
          <Card
            key={s.id}
            title={<span className="flex items-center gap-1.5">{s.icon} {s.title}</span>}
            colorDot={c.dot}
            open={!!openCards[cardId]}
            onToggle={() => toggleCard(cardId)}
            actions={
              <>
                <IconBtn onClick={() => moveSectionUp(idx)}   disabled={idx === 0}                       title="Di lên"><ArrowUpIcon className="w-3.5 h-3.5" /></IconBtn>
                <IconBtn onClick={() => moveSectionDown(idx)} disabled={idx === d.sections.length - 1}   title="Di xuống"><ArrowDownIcon className="w-3.5 h-3.5" /></IconBtn>
                <IconBtn onClick={() => delSection(s.id)} danger title="Xóa mục"><TrashIcon className="w-3.5 h-3.5" /></IconBtn>
              </>
            }
          >
            {/* Icon + Color */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Icon</FieldLabel>
                <input value={s.icon} onChange={(e) => setSection(s.id, 'icon', e.target.value)} className={inputCls} placeholder="🗓️" />
              </div>
              <div>
                <FieldLabel>Màu sắc</FieldLabel>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {Object.entries(COLORS).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setSection(s.id, 'color', key)}
                      title={cfg.label}
                      className={`w-6 h-6 rounded-full ${cfg.dot} border-2 transition-all ${
                        s.color === key ? 'border-gray-700 scale-125' : 'border-transparent hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <FieldLabel>Tiêu đề mục</FieldLabel>
              <input value={s.title} onChange={(e) => setSection(s.id, 'title', e.target.value)} className={inputCls} />
            </div>

            {/* Section intro */}
            <div>
              <FieldLabel>Mô tả mở đầu mục <span className="text-gray-300">(tùy chọn)</span></FieldLabel>
              <textarea value={s.intro} onChange={(e) => setSection(s.id, 'intro', e.target.value)}
                rows={2} className={`${inputCls} resize-none`} placeholder="Để trống nếu không cần..." />
            </div>

            {/* Items */}
            <div>
              <FieldLabel hint="· bọc text bằng **...** để in đậm">Danh sách điều khoản</FieldLabel>
              <div className="space-y-2">
                {s.items.map((item, ii) => (
                  <div key={ii} className="flex gap-1.5 items-start">
                    <span className={`${c.num} font-bold text-xs flex-shrink-0 w-5 text-right mt-2.5`}>{ii + 1}.</span>
                    <textarea
                      value={item}
                      onChange={(e) => setItem(s.id, ii, e.target.value)}
                      rows={2}
                      className={`flex-1 ${inputCls} resize-none`}
                    />
                    <div className="flex flex-col gap-0.5 flex-shrink-0 mt-1">
                      <IconBtn onClick={() => moveItemUp(s.id, ii)}   disabled={ii === 0}                    title="Di lên"><ArrowUpIcon className="w-3.5 h-3.5" /></IconBtn>
                      <IconBtn onClick={() => moveItemDown(s.id, ii)} disabled={ii === s.items.length - 1}   title="Di xuống"><ArrowDownIcon className="w-3.5 h-3.5" /></IconBtn>
                      <IconBtn onClick={() => delItem(s.id, ii)} danger title="Xóa điều khoản"><TrashIcon className="w-3.5 h-3.5" /></IconBtn>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => addItem(s.id)}
                className="mt-2 text-xs text-ghn-orange hover:text-ghn-orange-dark font-semibold flex items-center gap-1 transition-colors">
                <PlusIcon className="w-3.5 h-3.5" /> Thêm điều khoản
              </button>
            </div>
          </Card>
        );
      })}

      {/* Add section */}
      <button onClick={addSection}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-ghn-orange hover:text-ghn-orange transition-colors font-medium inline-flex items-center justify-center gap-1">
        <PlusIcon className="w-4 h-4" /> Thêm mục mới
      </button>

      {/* ── Closing ── */}
      <Card title={<span className="flex items-center gap-1.5"><PencilIcon className="w-4 h-4" /> Phần kết</span>} open={!!openCards.closing} onToggle={() => toggleCard('closing')}>
        <div>
          <FieldLabel>Đoạn văn kết</FieldLabel>
          <div className="space-y-2">
            {d.closing.paragraphs.map((p, i) => (
              <div key={i} className="flex gap-1.5">
                <textarea value={p} onChange={(e) => setClosingPara(i, e.target.value)}
                  rows={2} className={`flex-1 ${inputCls} resize-none`} />
                <IconBtn onClick={() => delClosingPara(i)} danger title="Xóa đoạn" className="mt-1 flex-shrink-0"><TrashIcon className="w-3.5 h-3.5" /></IconBtn>
              </div>
            ))}
          </div>
          <button onClick={addClosingPara}
            className="mt-2 text-xs text-ghn-orange hover:text-ghn-orange-dark font-semibold flex items-center gap-1 transition-colors">
            <PlusIcon className="w-3.5 h-3.5" /> Thêm đoạn văn
          </button>
        </div>
        <div>
          <FieldLabel>Chữ ký</FieldLabel>
          <input value={d.closing.signature} onChange={(e) => setClosingField('signature', e.target.value)}
            className={inputCls} placeholder="— Tên / chức danh" />
        </div>
      </Card>

      {/* Save / Cancel */}
      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave(d)} disabled={saving} className="flex-1 btn-primary py-3 inline-flex items-center justify-center gap-1.5">
          {saving ? 'Đang lưu...' : (<><BookmarkIcon className="w-4 h-4" /> Lưu tất cả thay đổi</>)}
        </button>
        <button onClick={onCancel} disabled={saving} className="flex-1 btn-ghost py-3">
          Hủy
        </button>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function RulesPage() {
  const { isAdmin } = useAuth();
  const [data, setData]         = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    adminApi.getRules()
      .then((res) => {
        const raw = res.data.data?.rules || '';
        try { setData(JSON.parse(raw)); } catch { setData(DEFAULT_DATA); }
      })
      .catch(() => setData(DEFAULT_DATA))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (newData) => {
    setSaving(true);
    setError('');
    try {
      await adminApi.updateRules(JSON.stringify(newData));
      setData(newData);
      setEditMode(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Lưu thất bại, vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Khôi phục về nội dung mặc định?')) return;
    handleSave(DEFAULT_DATA);
  };

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-6 h-6 border-2 border-ghn-orange border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* Admin toolbar */}
      {isAdmin && (
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-700 inline-flex items-center gap-1.5">
            {editMode ? (<><PencilSquareIcon className="w-4 h-4" /> Chỉnh sửa nội quy</>) : 'Nội quy phòng họp'}
          </h2>
          {!editMode && (
            <div className="flex gap-2">
              <button onClick={handleReset}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <ArrowUturnLeftIcon className="w-3.5 h-3.5" /> Mặc định
              </button>
              <button onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-ghn-orange text-white text-sm font-semibold hover:bg-ghn-orange-dark transition-colors">
                <PencilSquareIcon className="w-3.5 h-3.5" />
                Chỉnh sửa
              </button>
            </div>
          )}
        </div>
      )}

      {saved  && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium inline-flex items-center gap-1.5">
          <CheckCircleIcon className="w-4 h-4" /> Đã lưu thành công.
        </div>
      )}
      {error  && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

      {editMode ? (
        <EditForm initial={data} onSave={handleSave} onCancel={() => setEditMode(false)} saving={saving} />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <RulesDisplay data={data} />
        </div>
      )}
    </div>
  );
}
