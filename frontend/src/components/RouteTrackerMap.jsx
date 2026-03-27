import React, { useEffect, useMemo, useState } from 'react';
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
} from 'react-leaflet';

const midpoint = (a, b) => [
  (a[0] + b[0]) / 2,
  (a[1] + b[1]) / 2,
];

const distanceMeters = (a, b) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
};

const RouteTrackerMap = ({ start, destination }) => {
  const [currentPosition, setCurrentPosition] = useState(null);
  const [trail, setTrail] = useState([]);
  const [locationError, setLocationError] = useState('');
  const [wakeReminderEnabled, setWakeReminderEnabled] = useState(false);
  const [wakeRadiusMeters, setWakeRadiusMeters] = useState(350);
  const [distanceToDestination, setDistanceToDestination] = useState(null);
  const [alarmTriggered, setAlarmTriggered] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('Wake-up reminder is off.');

  const triggerWakeAlert = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([250, 120, 250, 120, 250]);
    }

    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioCtx();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.35);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.35);
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Navvia reminder', {
        body: 'You are near your destination. Time to prepare to get off.',
      });
    }
  };

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported on this device.');
      return undefined;
    }

    const watcherId = navigator.geolocation.watchPosition(
      (position) => {
        const nextPoint = [position.coords.latitude, position.coords.longitude];
        setCurrentPosition(nextPoint);
        setLocationError('');

        setTrail((current) => {
          if (current.length === 0) {
            return [nextPoint];
          }

          const lastPoint = current[current.length - 1];
          if (distanceMeters(lastPoint, nextPoint) < 12) {
            return current;
          }

          return [...current, nextPoint];
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission is blocked. Enable location to track your movement.');
          return;
        }

        setLocationError('Unable to read your current location right now.');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watcherId);
    };
  }, []);

  useEffect(() => {
    if (!currentPosition) {
      return;
    }

    const nextDistance = Math.round(distanceMeters(currentPosition, destination));
    setDistanceToDestination(nextDistance);

    if (!wakeReminderEnabled || alarmTriggered) {
      return;
    }

    if (nextDistance <= wakeRadiusMeters) {
      setAlarmTriggered(true);
      setReminderMessage(`Wake up alert! You are about ${nextDistance}m from your destination.`);
      triggerWakeAlert();
    }
  }, [currentPosition, destination, wakeReminderEnabled, wakeRadiusMeters, alarmTriggered]);

  useEffect(() => {
    if (!wakeReminderEnabled) {
      setReminderMessage('Wake-up reminder is off.');
      return;
    }

    if (alarmTriggered) {
      return;
    }

    const distanceText = distanceToDestination ? `${distanceToDestination}m` : 'unknown distance';
    setReminderMessage(`Reminder on. Alert will trigger within ${wakeRadiusMeters}m. Current distance: ${distanceText}.`);
  }, [wakeReminderEnabled, wakeRadiusMeters, distanceToDestination, alarmTriggered]);

  const toggleWakeReminder = async () => {
    const turningOn = !wakeReminderEnabled;
    setWakeReminderEnabled(turningOn);

    if (!turningOn) {
      setAlarmTriggered(false);
      setReminderMessage('Wake-up reminder is off.');
      return;
    }

    setAlarmTriggered(false);

    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // Ignore notification permission errors and keep in-app reminder active.
      }
    }
  };

  const center = useMemo(() => currentPosition || midpoint(start, destination), [currentPosition, start, destination]);

  return (
    <div className="route-tracker-shell">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        className="route-tracker-canvas"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <CircleMarker center={start} radius={9} pathOptions={{ color: '#4f88ff', fillColor: '#4f88ff', fillOpacity: 0.9 }}>
          <Popup>Route start point</Popup>
        </CircleMarker>

        <CircleMarker center={destination} radius={9} pathOptions={{ color: '#1a1e25', fillColor: '#1a1e25', fillOpacity: 0.9 }}>
          <Popup>Route destination</Popup>
        </CircleMarker>

        {currentPosition && (
          <CircleMarker center={currentPosition} radius={8} pathOptions={{ color: '#2bc28b', fillColor: '#2bc28b', fillOpacity: 0.95 }}>
            <Popup>You are here</Popup>
          </CircleMarker>
        )}

        <Polyline positions={[start, destination]} pathOptions={{ color: '#5e74d9', weight: 4, opacity: 0.7 }} />

        {trail.length > 1 && (
          <Polyline positions={trail} pathOptions={{ color: '#2bc28b', weight: 3, opacity: 0.9 }} />
        )}
      </MapContainer>

      <div className="tracker-legend">
        <span><b className="legend-dot start"></b> Start</span>
        <span><b className="legend-dot destination"></b> Destination</span>
        <span><b className="legend-dot live"></b> Your location</span>
      </div>

      <div className="tracker-reminder-box">
        <div className="tracker-reminder-row">
          <button
            type="button"
            className={`tracker-reminder-btn ${wakeReminderEnabled ? 'active' : ''}`}
            onClick={toggleWakeReminder}
          >
            {wakeReminderEnabled ? 'Wake reminder: ON' : 'Wake reminder: OFF'}
          </button>

          <select
            value={wakeRadiusMeters}
            onChange={(event) => {
              setWakeRadiusMeters(Number(event.target.value));
              setAlarmTriggered(false);
            }}
            aria-label="Alert distance threshold"
          >
            <option value={200}>200m</option>
            <option value={350}>350m</option>
            <option value={500}>500m</option>
            <option value={800}>800m</option>
          </select>
        </div>

        <p className={`tracker-reminder-text ${alarmTriggered ? 'alarm' : ''}`}>{reminderMessage}</p>
      </div>

      {locationError && <p className="form-message error-message">{locationError}</p>}
    </div>
  );
};

export default RouteTrackerMap;
