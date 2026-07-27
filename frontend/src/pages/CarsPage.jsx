import { useCallback, useEffect, useState } from 'react';
import { carsApi, carBookingsApi, adminApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import CarWeekCalendar from '../components/CarWeekCalendar';
import CarBookingModal from '../components/CarBookingModal';
import CarFormModal from '../components/CarFormModal';
import CarRulesPanel from '../components/CarRulesPanel';
import {
  TruckIcon,
  PlusIcon,
  PencilIcon,
  Square2StackIcon,
} from '@heroicons/react/24/outline';

export default function CarsPage() {
  const { isAdmin } = useAuth();

  const [cars, setCars] = useState([]);
  const [carsLoading, setCarsLoading] = useState(true);
  const [selectedCarId, setSelectedCarId] = useState(null);

  const [weekRange, setWeekRange] = useState(null);
  const [bookings, setBookings] = useState([]);

  const [detailsVisible, setDetailsVisible] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);

  const [carFormOpen, setCarFormOpen] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [bookingModal, setBookingModal] = useState(null); // { mode: 'create'|'edit', ...slotOrBooking }

  const fetchCars = useCallback(() => {
    setCarsLoading(true);
    carsApi.getAll({ include_inactive: isAdmin ? 'true' : undefined })
      .then((res) => {
        const list = res.data.data?.cars || [];
        setCars(list);
        setSelectedCarId((prev) => prev && list.some((c) => c.id === prev)
          ? prev
          : (list.find((c) => c.is_active) || list[0])?.id || null);
      })
      .catch(() => setCars([]))
      .finally(() => setCarsLoading(false));
  }, [isAdmin]);

  useEffect(() => { fetchCars(); }, [fetchCars]);

  useEffect(() => {
    if (isAdmin) {
      adminApi.getSettings()
        .then((res) => setDetailsVisible(res.data.data?.settings?.car_booking_details_visible === 'true'))
        .catch(() => {});
    }
  }, [isAdmin]);

  const fetchBookings = useCallback(() => {
    if (!selectedCarId || !weekRange) return;
    carBookingsApi.getBookings(selectedCarId, weekRange.start, weekRange.end)
      .then((res) => setBookings(res.data.data?.bookings || []))
      .catch(() => setBookings([]));
  }, [selectedCarId, weekRange]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleWeekChange = useCallback((start, end) => {
    setWeekRange((prev) => (prev && prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  const handleToggleVisibility = () => {
    const next = !detailsVisible;
    setSavingVisibility(true);
    adminApi.updateSettings({ car_booking_details_visible: next })
      .then(() => { setDetailsVisible(next); fetchBookings(); })
      .catch(() => {})
      .finally(() => setSavingVisibility(false));
  };

  const selectedCar = cars.find((c) => c.id === selectedCarId) || null;

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 flex p-4 gap-3 overflow-hidden">
        {/* Left column: rules + car selector */}
        <div className="w-64 shrink-0 flex flex-col gap-3 overflow-y-auto">
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700 inline-flex items-center gap-1.5">
                <TruckIcon className="w-4 h-4 text-ghn-orange" /> Xe công ty
              </h3>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => { setEditingCar(null); setCarFormOpen(true); }}
                  title="Thêm xe"
                  className="text-gray-400 hover:text-ghn-orange transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            {carsLoading ? (
              <p className="text-xs text-gray-400">Đang tải...</p>
            ) : cars.length === 0 ? (
              <p className="text-xs text-gray-400">Chưa có xe nào.</p>
            ) : (
              <div className="space-y-1">
                {cars.map((car) => (
                  <div
                    key={car.id}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors ${
                      selectedCarId === car.id ? 'bg-orange-50 border border-ghn-orange/40' : 'hover:bg-gray-50 border border-transparent'
                    } ${!car.is_active ? 'opacity-50' : ''}`}
                    onClick={() => setSelectedCarId(car.id)}
                  >
                    <Square2StackIcon className="w-4 h-4 text-ghn-orange shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{car.name}</p>
                      {car.seats && <p className="text-[11px] text-gray-400">{car.seats} chỗ</p>}
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEditingCar(car); setCarFormOpen(true); }}
                        className="shrink-0 text-gray-300 hover:text-ghn-orange transition-colors"
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isAdmin && (
              <label className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 cursor-pointer">
                <span className="text-xs text-gray-600">Hiển thị chi tiết cho nhân viên</span>
                <input
                  type="checkbox"
                  checked={detailsVisible}
                  disabled={savingVisibility}
                  onChange={handleToggleVisibility}
                  className="rounded border-gray-300 text-ghn-orange focus:ring-ghn-orange"
                />
              </label>
            )}

            {!isAdmin && (
              <p className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-400 leading-relaxed">
                Thấy khung giờ trống? Nhắn Admin để đặt xe.
              </p>
            )}
          </div>

          <CarRulesPanel />
        </div>

        {/* Main: week calendar */}
        {selectedCar ? (
          <CarWeekCalendar
            bookings={bookings}
            isAdmin={isAdmin}
            onWeekChange={handleWeekChange}
            onCreateSlot={(slot) => setBookingModal({ mode: 'create', ...slot })}
            onEditBooking={(booking) => setBookingModal({ mode: 'edit', booking })}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm rounded-xl border border-gray-200 bg-gray-50">
            {carsLoading ? 'Đang tải...' : 'Chưa có xe nào — admin hãy thêm xe để bắt đầu.'}
          </div>
        )}
      </div>

      {carFormOpen && (
        <CarFormModal
          car={editingCar}
          onClose={() => setCarFormOpen(false)}
          onSaved={fetchCars}
        />
      )}

      {bookingModal && isAdmin && (
        <CarBookingModal
          car={selectedCar}
          booking={bookingModal.mode === 'edit' ? bookingModal.booking : null}
          startTime={bookingModal.mode === 'create' ? bookingModal.startTime : undefined}
          endTime={bookingModal.mode === 'create' ? bookingModal.endTime : undefined}
          onClose={() => setBookingModal(null)}
          onSaved={fetchBookings}
        />
      )}
    </div>
  );
}
