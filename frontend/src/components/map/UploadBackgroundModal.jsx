import { useState } from 'react';
import { XMarkIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';

/** Modal admin-only: upload/thay ảnh sơ đồ tầng (lưu trên Supabase Storage). */
export default function UploadBackgroundModal({
  location,
  floor,
  hasBackground,
  uploading,
  error,
  onClose,
  onUpload,
  onDelete,
}) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Cập nhật sơ đồ tầng</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-500">{location} · Tầng {floor}</p>

          <label className="block border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-ghn-orange transition-colors">
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} />
            {previewUrl ? (
              <img src={previewUrl} alt="Xem trước" className="max-h-48 mx-auto rounded-lg" />
            ) : (
              <div className="text-gray-400">
                <PhotoIcon className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Chọn file ảnh PNG, JPG hoặc WebP</p>
                <p className="text-xs mt-1">File PDF cần xuất/chụp sang ảnh trước khi tải lên</p>
              </div>
            )}
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
          )}

          <div className="flex gap-3">
            {hasBackground && (
              <button
                type="button"
                onClick={onDelete}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium disabled:opacity-40 transition-colors"
              >
                <TrashIcon className="w-4 h-4" /> Xoá ảnh hiện tại
              </button>
            )}
            <button
              type="button"
              onClick={() => file && onUpload(file)}
              disabled={!file || uploading}
              className="flex-1 btn-primary disabled:opacity-40"
            >
              {uploading ? 'Đang tải lên...' : 'Tải lên'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
