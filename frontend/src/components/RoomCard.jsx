import {
  TvIcon,
  FilmIcon,
  RectangleGroupIcon,
  VideoCameraIcon,
  MicrophoneIcon,
  BeakerIcon,
  CloudIcon,
  WifiIcon,
  PhoneIcon,
  CheckIcon,
  MapPinIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/20/solid';

export default function RoomCard({ room, onBook, compact = false }) {
  const amenities = room.amenities || [];

  const amenityIcons = {
    'TV': TvIcon,
    'Projector': FilmIcon,
    'Whiteboard': RectangleGroupIcon,
    'Video Conference': VideoCameraIcon,
    'Audio Conference': MicrophoneIcon,
    'Coffee Machine': BeakerIcon,
    'Air Conditioning': CloudIcon,
    'WiFi': WifiIcon,
    'Phone': PhoneIcon,
  };

  if (compact) {
    return (
      <div className="card p-4 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-sm truncate">{room.name}</h3>
              {room.is_vip && (
                <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">VIP</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{room.location} · Tầng {room.floor}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-ghn-orange font-bold text-sm">{room.capacity}</span>
            <span className="text-xs text-gray-500"> người</span>
          </div>
        </div>
        {onBook && (
          <button onClick={() => onBook(room)} className="btn-primary w-full mt-3 text-sm py-2">
            Đặt phòng
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden hover:shadow-lg transition-all duration-200 group">
      {/* Header stripe */}
      <div className="h-2 bg-gradient-to-r from-ghn-orange to-ghn-orange-dark" />

      <div className="p-5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900 text-base">{room.name}</h3>
              {room.is_vip && (
                <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-0.5 rounded-full">
                  <StarIcon className="w-3 h-3" /> VIP
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{room.code}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-ghn-orange">{room.capacity}</p>
            <p className="text-xs text-gray-500">người</p>
          </div>
        </div>

        {/* Info */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <MapPinIcon className="w-4 h-4" /> {room.location}
          </span>
          <span className="flex items-center gap-1">
            <BuildingOfficeIcon className="w-4 h-4" /> Tầng {room.floor}
          </span>
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {amenities.slice(0, 5).map((a, i) => {
              const AmenityIcon = amenityIcons[a.amenity] || CheckIcon;
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                >
                  <AmenityIcon className="w-3.5 h-3.5" /> {a.amenity}
                </span>
              );
            })}
            {amenities.length > 5 && (
              <span className="text-xs text-gray-400 px-2 py-0.5">+{amenities.length - 5}</span>
            )}
          </div>
        )}

        {onBook && (
          <button
            onClick={() => onBook(room)}
            className="btn-primary w-full group-hover:bg-ghn-orange-dark"
          >
            Đặt phòng này
          </button>
        )}
      </div>
    </div>
  );
}
