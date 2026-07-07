export default function BookingStatusBadge({ status }) {
  const map = {
    confirmed: { label: 'Đã xác nhận', cls: 'badge-confirmed' },
    pending: { label: 'Chờ xác nhận', cls: 'badge-pending' },
    cancelled: { label: 'Đã hủy', cls: 'badge-cancelled' },
    completed: { label: 'Hoàn thành', cls: 'badge-completed' },
  };
  const { label, cls } = map[status] || { label: status, cls: 'badge-completed' };
  return <span className={cls}>{label}</span>;
}
