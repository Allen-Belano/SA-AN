import React from 'react';
import { normalizeMemoji } from './memojiConfig';

const renderHair = (style, color) => {
  if (style === 'bob') {
    return <path d="M20 46 C20 22, 80 22, 80 46 L80 58 C74 64, 68 67, 60 67 L40 67 C32 67, 26 64, 20 58 Z" fill={color} />;
  }

  if (style === 'curly') {
    return (
      <>
        <circle cx="30" cy="34" r="11" fill={color} />
        <circle cx="45" cy="29" r="12" fill={color} />
        <circle cx="60" cy="30" r="12" fill={color} />
        <circle cx="72" cy="36" r="10" fill={color} />
      </>
    );
  }

  if (style === 'bun') {
    return (
      <>
        <circle cx="50" cy="18" r="10" fill={color} />
        <path d="M24 44 C24 25, 76 25, 76 44 L76 54 C70 60, 64 63, 56 63 L44 63 C36 63, 30 60, 24 54 Z" fill={color} />
      </>
    );
  }

  return <path d="M24 42 C24 24, 76 24, 76 42 L76 50 C71 57, 64 60, 56 60 L44 60 C36 60, 29 57, 24 50 Z" fill={color} />;
};

const renderEyes = (style, color) => {
  if (style === 'happy') {
    return (
      <>
        <path d="M36 52 Q40 48 44 52" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M56 52 Q60 48 64 52" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </>
    );
  }

  if (style === 'wink') {
    return (
      <>
        <circle cx="40" cy="52" r="2.6" fill={color} />
        <path d="M56 52 L64 52" stroke={color} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      </>
    );
  }

  return (
    <>
      <circle cx="40" cy="52" r="2.8" fill={color} />
      <circle cx="60" cy="52" r="2.8" fill={color} />
    </>
  );
};

const renderMouth = (style, color) => {
  if (style === 'grin') {
    return <path d="M42 68 Q50 75 58 68" stroke={color} strokeWidth="2.8" fill="none" strokeLinecap="round" />;
  }

  if (style === 'open') {
    return <ellipse cx="50" cy="69" rx="5" ry="3.7" fill={color} />;
  }

  return <path d="M43 69 Q50 73 57 69" stroke={color} strokeWidth="2.4" fill="none" strokeLinecap="round" />;
};

const renderAccessory = (style) => {
  if (style === 'glasses') {
    return (
      <>
        <circle cx="40" cy="52" r="6" stroke="#2a3038" strokeWidth="2" fill="none" />
        <circle cx="60" cy="52" r="6" stroke="#2a3038" strokeWidth="2" fill="none" />
        <line x1="46" y1="52" x2="54" y2="52" stroke="#2a3038" strokeWidth="2" />
      </>
    );
  }

  if (style === 'blush') {
    return (
      <>
        <ellipse cx="31" cy="61" rx="5" ry="3" fill="rgba(224, 112, 137, 0.35)" />
        <ellipse cx="69" cy="61" rx="5" ry="3" fill="rgba(224, 112, 137, 0.35)" />
      </>
    );
  }

  if (style === 'earring') {
    return <circle cx="70" cy="65" r="2.2" fill="#f4d26c" />;
  }

  return null;
};

const MemojiAvatar = ({ config, size = 40, className = '' }) => {
  const avatar = normalizeMemoji(config);

  return (
    <svg
      className={`memoji-avatar ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-label="Memoji avatar"
      role="img"
    >
      <circle cx="50" cy="50" r="49" fill={avatar.bgColor} />
      <circle cx="50" cy="58" r="24" fill={avatar.skinTone} />
      <ellipse cx="28" cy="59" rx="4" ry="7" fill={avatar.skinTone} />
      <ellipse cx="72" cy="59" rx="4" ry="7" fill={avatar.skinTone} />
      {renderHair(avatar.hairStyle, avatar.hairColor)}
      {renderEyes(avatar.eyeStyle, avatar.eyeColor)}
      <path d="M50 56 L50 62" stroke="rgba(132, 86, 64, 0.35)" strokeWidth="1.8" strokeLinecap="round" />
      {renderMouth(avatar.mouthStyle, avatar.mouthColor)}
      {renderAccessory(avatar.accessory)}
    </svg>
  );
};

export default MemojiAvatar;
