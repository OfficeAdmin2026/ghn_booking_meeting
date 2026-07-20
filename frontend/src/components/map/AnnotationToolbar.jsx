import { motion } from 'framer-motion';
import { XMarkIcon, CheckIcon, ArrowUturnLeftIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { POI_META } from './poiMeta';

const TYPE_ORDER = ['elevator', 'toilet', 'pantry', 'printer', 'exit', 'department'];

export default function AnnotationToolbar({
  isEditing,
  draft,
  onChangeDraft,
  activeDrawTool,
  drawingPoints,
  onStartDraw,
  onUndoPoint,
  onClearDraw,
  onCancelDraw,
  onSave,
  onSaveMeta,
  onDelete,
  onClose,
  saving,
}) {
  const drawing = activeDrawTool === 'annotation';
  const canSaveDraw = (drawingPoints?.length || 0) === 1 || (drawingPoints?.length || 0) >= 3;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', duration: 0.25 }}
      className="fixed top-16 right-0 bottom-0 w-full sm:w-96 bg-white shadow-xl border-l border-gray-100 z-40 overflow-y-auto"
    >
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900">
          {isEditing ? 'Sửa khu vực chung' : 'Thêm khu vực chung'}
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {!drawing ? (
          <>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Loại khu vực</h3>
              <div className="grid grid-cols-3 gap-2">
                {TYPE_ORDER.map((type) => {
                  const meta = POI_META[type];
                  const Icon = meta.Icon;
                  const selected = draft.type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => onChangeDraft({ type, color: meta.color })}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
                        selected
                          ? 'border-ghn-orange bg-ghn-orange-light text-ghn-orange'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" style={{ color: selected ? undefined : meta.color }} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Màu</h3>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={draft.color}
                  onChange={(e) => onChangeDraft({ color: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                />
                <span className="text-sm text-gray-500 font-mono">{draft.color}</span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nhãn (tuỳ chọn)</h3>
              <input
                type="text"
                value={draft.label}
                onChange={(e) => onChangeDraft({ label: e.target.value })}
                placeholder={POI_META[draft.type]?.label}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ghn-orange/30 focus:border-ghn-orange"
              />
            </div>

            <button
              onClick={onStartDraw}
              className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-medium text-ghn-orange bg-ghn-orange-light hover:bg-orange-100 rounded-lg px-4 py-2 transition-colors"
            >
              <PencilIcon className="w-4 h-4" /> {isEditing ? 'Vẽ lại vị trí' : 'Bắt đầu vẽ'}
            </button>

            {isEditing && (
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={onSaveMeta}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-ghn-orange rounded-lg px-4 py-2 hover:bg-ghn-orange-dark disabled:opacity-40 transition-colors"
                >
                  <CheckIcon className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button
                  onClick={onDelete}
                  disabled={saving}
                  title="Xoá khu vực này"
                  className="shrink-0 px-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              Nhấp 1 điểm để đặt icon, hoặc từ 3 điểm trở lên để tô vùng màu ({drawingPoints?.length || 0} điểm đã thêm).
            </p>
            <div className="flex gap-2">
              <button
                onClick={onUndoPoint}
                disabled={!drawingPoints?.length}
                className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ArrowUturnLeftIcon className="w-3.5 h-3.5" /> Hoàn tác
              </button>
              <button
                onClick={onClearDraw}
                disabled={!drawingPoints?.length}
                className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <TrashIcon className="w-3.5 h-3.5" /> Xoá hết
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onCancelDraw}
                className="flex-1 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={onSave}
                disabled={!canSaveDraw || saving}
                className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-semibold text-white bg-ghn-orange rounded-lg px-3 py-1.5 hover:bg-ghn-orange-dark disabled:opacity-40 transition-colors"
              >
                <CheckIcon className="w-3.5 h-3.5" /> {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
