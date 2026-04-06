import React, { useMemo, useState } from 'react';
import { askCommuterChatbot, getStoredSession } from '../api';

const quickPrompts = [
  'Where am I now?',
  'Place trivia near me',
  'Jeepney etiquette',
  'MRT/LRT queue rules',
  'How to pay fare',
  'What to do in emergency',
  'Night commute safety',
];

const knownPlaces = [
  {
    name: 'Rizal Park, Manila',
    latitude: 14.5820,
    longitude: 120.9793,
    radiusKm: 2.2,
    trivia: 'Rizal Park, also called Luneta, is one of the largest urban parks in Asia and where Dr. Jose Rizal was executed in 1896.',
  },
  {
    name: 'Intramuros, Manila',
    latitude: 14.5896,
    longitude: 120.9747,
    radiusKm: 1.8,
    trivia: 'Intramuros is the historic walled city built during the Spanish colonial period and still houses centuries-old churches and landmarks.',
  },
  {
    name: 'BGC High Street, Taguig',
    latitude: 14.5508,
    longitude: 121.0513,
    radiusKm: 2.0,
    trivia: 'Bonifacio Global City was transformed from military land into a modern business district with wide walkable streets and public art.',
  },
  {
    name: 'SM Mall of Asia, Pasay',
    latitude: 14.5350,
    longitude: 120.9822,
    radiusKm: 2.4,
    trivia: 'Mall of Asia is one of the largest malls in the Philippines and sits along Manila Bay, near the famous sunset view spots.',
  },
  {
    name: 'Quezon Memorial Circle, Quezon City',
    latitude: 14.6507,
    longitude: 121.0498,
    radiusKm: 2.6,
    trivia: 'Quezon Memorial Circle contains the mausoleum of President Manuel L. Quezon and a major urban park in Quezon City.',
  },
  {
    name: 'Cebu City Downtown',
    latitude: 10.3157,
    longitude: 123.8854,
    radiusKm: 3.2,
    trivia: 'Cebu City is one of the oldest settlements in the Philippines and a historic center of trade and Christianity in the Visayas.',
  },
  {
    name: 'Davao City Center',
    latitude: 7.1907,
    longitude: 125.4553,
    radiusKm: 3.2,
    trivia: 'Davao City is known for Mount Apo access, durian markets, and one of the largest city land areas in the country.',
  },
];

const toRad = (value) => (value * Math.PI) / 180;

const distanceInKm = (aLat, aLng, bLat, bLng) => {
  const earthRadiusKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const startLat = toRad(aLat);
  const endLat = toRad(bLat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(startLat) * Math.cos(endLat) * sinLng * sinLng;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
};

const resolveNearestPlace = (latitude, longitude) => {
  let closest = null;

  for (const place of knownPlaces) {
    const distance = distanceInKm(latitude, longitude, place.latitude, place.longitude);

    if (distance <= place.radiusKm && (!closest || distance < closest.distance)) {
      closest = { ...place, distance };
    }
  }

  return closest;
};

const isLocationPrompt = (input) => /where am i|my location|current place|where are we|near me|trivia near me|place trivia|gps/.test(input);

const cannedReplies = [
  {
    test: (input) => /jeep|jeepney/.test(input),
    text: 'Jeepney behavior guide: Queue before boarding, pass fare politely with "Bayad po", avoid blocking the aisle, and say "Para po" early before your stop.',
  },
  {
    test: (input) => /mrt|lrt|train|station|queue/.test(input),
    text: 'MRT/LRT behavior guide: Fall in line, let passengers alight first, keep right on escalators, and avoid loud calls/music. Prepare your card or ticket before the gate.',
  },
  {
    test: (input) => /bus|carousel/.test(input),
    text: 'Bus behavior guide: Queue at designated stops, tap/beep card fast when possible, move inward after boarding, and keep bags compact during rush hour.',
  },
  {
    test: (input) => /pay|fare|bayad|change/.test(input),
    text: 'Fare tips: Keep small bills/coins ready, confirm fare for your exact destination, ask for change immediately, and keep receipts where issued.',
  },
  {
    test: (input) => /safe|safety|night|snatch|holdap|danger/.test(input),
    text: 'Safety tips: Stay in well-lit waiting areas, keep your phone and wallet secure, avoid showing cash, share your live location with a trusted contact, and choose crowded stops late at night.',
  },
  {
    test: (input) => /emergency|help|911|accident|harass/.test(input),
    text: 'Emergency steps: Move to a populated area, ask help from station staff/security, call 911 for urgent incidents, and document key details (time, route, plate number) when safe.',
  },
  {
    test: (input) => /pwd|senior|pregnant|priority/.test(input),
    text: 'Commuter courtesy: Offer priority seats to seniors, PWDs, pregnant passengers, and persons with children. Keep pathways clear for easier movement.',
  },
];

const fallbackReply = 'I can guide commuting behavior in PH. Try asking about jeepney etiquette, MRT/LRT rules, fare payment, safety, or emergency steps.';

const buildReply = (rawMessage) => {
  const message = rawMessage.trim().toLowerCase();

  for (const reply of cannedReplies) {
    if (reply.test(message)) {
      return reply.text;
    }
  }

  return fallbackReply;
};

const CommuterGuideChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [locationInsight, setLocationInsight] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: 'Hi! I am Navvia, your SA/AN commute buddy. I can use GPS for place trivia and still answer commuter guidance offline.',
    },
  ]);
  const [lastRouteContext, setLastRouteContext] = useState({ start: '', destination: '' });

  const session = getStoredSession();

  const quickActions = useMemo(() => quickPrompts, []);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const appendUserMessage = (text) => {
    const cleanText = text.trim();
    if (!cleanText) return null;

    setMessages((current) => [...current, { role: 'user', text: cleanText }]);
    return cleanText;
  };

  const appendBotMessage = (text) => {
    setMessages((current) => [...current, { role: 'bot', text }]);
  };

  const requestLocationInsight = () => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('unsupported');
      return Promise.resolve('This device does not support GPS geolocation, so I cannot detect your current place.');
    }

    setLocationStatus('locating');

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = Number(position.coords.latitude.toFixed(5));
          const longitude = Number(position.coords.longitude.toFixed(5));
          const nearestPlace = resolveNearestPlace(latitude, longitude);

          setLocationStatus('ready');
          setLocationInsight({ latitude, longitude, nearestPlace });

          if (nearestPlace) {
            const distance = nearestPlace.distance.toFixed(1);
            resolve(`You are near ${nearestPlace.name} (about ${distance} km). Trivia: ${nearestPlace.trivia}`);
            return;
          }

          resolve(`Your GPS location is ${latitude}, ${longitude}. I do not have a saved trivia spot for this exact area yet, but I can still guide commute behavior offline.`);
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setLocationStatus('blocked');
            resolve('I need GPS permission to tell your place and trivia. Please turn on Location/GPS and allow browser access.');
            return;
          }

          setLocationStatus('error');
          resolve('I could not read your GPS location right now. Please turn on GPS and try again.');
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000,
        }
      );
    });
  };

  const addConversation = async (text) => {
    const cleanText = appendUserMessage(text);
    if (!cleanText) return;

    const lowercaseText = cleanText.toLowerCase();

    if (isLocationPrompt(lowercaseText)) {
      const locationReply = await requestLocationInsight();
      appendBotMessage(locationReply);
    } else {
      const routeHint = cleanText.match(/from\s+(.+?)\s+to\s+(.+)/i);
      const nextContext = routeHint
        ? { start: routeHint[1].trim(), destination: routeHint[2].trim() }
        : lastRouteContext;

      if (routeHint) {
        setLastRouteContext(nextContext);
      }

      try {
        const response = await askCommuterChatbot({
          message: cleanText,
          user_id: session?.user?.user_id,
          start: nextContext.start,
          destination: nextContext.destination,
        });

        appendBotMessage(response.answer || buildReply(cleanText));
      } catch {
        appendBotMessage(buildReply(cleanText));
      }
    }

    setDraft('');
    setIsOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await addConversation(draft);
  };

  const handleQuickPrompt = async (prompt) => {
    await addConversation(prompt);
  };

  const locationStatusLabel = {
    idle: 'GPS idle',
    locating: 'GPS locating...',
    ready: 'GPS ready',
    blocked: 'GPS blocked',
    unsupported: 'GPS unsupported',
    error: 'GPS error',
  }[locationStatus];

  const onlineStatusLabel = isOnline ? 'Online' : 'Offline mode';

  const lastLocationText = locationInsight
    ? `${locationInsight.latitude}, ${locationInsight.longitude}`
    : 'No GPS fix yet';

  const panelLabel = `Commuter guide chatbot. ${onlineStatusLabel}. ${locationStatusLabel}. Last location: ${lastLocationText}`;

  const triggerGpsLookup = async () => {
    const locationReply = await requestLocationInsight();
    appendBotMessage(locationReply);
    setIsOpen(true);
  };

  return (
    <div className="commuter-chatbot" aria-live="polite">
      {isOpen && (
        <section className="chatbot-panel" aria-label={panelLabel}>
          <header className="chatbot-header">
            <div>
              <strong>Navvia</strong>
              <p>PH commuting behavior tips</p>
            </div>
            <div className="chatbot-status-wrap">
              <span className={`chatbot-status ${isOnline ? 'online' : 'offline'}`}>{onlineStatusLabel}</span>
              <span className={`chatbot-status ${locationStatus}`}>{locationStatusLabel}</span>
            </div>
            <button
              type="button"
              className="chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close commuter guide chatbot"
            >
              x
            </button>
          </header>

          <div className="chatbot-thread">
            {messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`chat-bubble ${message.role}`}>
                {message.text}
              </article>
            ))}
          </div>

          <div className="chatbot-prompts" aria-label="Quick prompts">
            {quickActions.map((prompt) => (
              <button key={prompt} type="button" onClick={() => handleQuickPrompt(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <button type="button" className="chatbot-location-btn" onClick={triggerGpsLookup}>
            Check my location trivia
          </button>

          <form className="chatbot-input-row" onSubmit={handleSubmit}>
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about commuting behavior"
              aria-label="Type your commuting question"
            />
            <button type="submit">Send</button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="chatbot-fab navvia-fab"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={`${isOpen ? 'Collapse' : 'Open'} Navvia commuter guide chatbot`}
        title={isOpen ? 'Collapse Navvia' : 'Open Navvia'}
      >
        <span className="navvia-stage" aria-hidden="true">
          <span className="navvia-bot">
            <span className="navvia-antenna"></span>
            <span className="navvia-head">
              <span className="navvia-eye left"></span>
              <span className="navvia-eye right"></span>
            </span>
            <span className="navvia-body"></span>
          </span>
        </span>
      </button>
    </div>
  );
};

export default CommuterGuideChatbot;
