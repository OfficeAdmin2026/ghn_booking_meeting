/**
 * Backend không có cron job đổi trạng thái booking theo thời gian — chỉ ghi
 * 'confirmed' | 'cancelled' | 'completed'. Vì vậy "đang họp hay không" phải
 * tính thuần phía client bằng cách so sánh giờ hiện tại với start_time/end_time.
 */
export function isRoomOccupiedNow(bookings, now = new Date()) {
  const current = (bookings || []).find(
    (b) =>
      b.status === 'confirmed' &&
      new Date(b.start_time) <= now &&
      now < new Date(b.end_time)
  );
  return { occupied: !!current, currentBooking: current || null };
}
