import { useState } from 'react';
import { carsApi } from '../api';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function CarFormModal({ car, onClose, onSaved }) {
  const isEdit = !!car;
  const [name, setName] = useState(car?.name || '');
  const [licensePlate, setLicensePlate] = useState(car?.license_plate || '');
  const [seats, setSeats] = useState(car?.seats ?? '');
  const [driverNote, setDriverNote] = useState(car?.driver_note || '');
  const [isActive, setIsActive] = useState(car?.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Tên xe là bắt buộc'); return; }
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        license_plate: licensePlate.trim() || null,
        seats: seats === '' ? null : parseInt(seats, 10),
        driver_note: driverNote.trim() || null,
        ...(isEdit ? { is_active: isActive } : {}),
      };
      if (isEdit) {
        await carsApi.update(car.id, payload);
      } else {
        await carsApi.create(payload);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Lưu thông tin xe thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Sửa thông tin xe' : 'Thêm xe mới'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tên xe <span className="text-red-500">*</span>
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="input-field" placeholder="VD: Xe 1 - Innova" required maxLength={200} autoFocus />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Biển số</label>
            <input type="text" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)}
              className="input-field" placeholder="VD: 51A-123.45" maxLength={50} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Số chỗ ngồi</label>
            <input type="number" min="1" value={seats} onChange={(e) => setSeats(e.target.value)}
              className="input-field" placeholder="VD: 7" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tài xế / Ghi chú</label>
            <textarea value={driverNote} onChange={(e) => setDriverNote(e.target.value)}
              className="input-field resize-none" rows={2} placeholder="Tên tài xế, số điện thoại, ghi chú khác..." />
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300 text-ghn-orange focus:ring-ghn-orange" />
              Đang hoạt động (bỏ chọn để ẩn xe khỏi danh sách)
            </label>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost px-5">Huỷ</button>
          </div>
        </form>
      </div>
    </div>
  );
}
