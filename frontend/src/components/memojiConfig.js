export const defaultMemoji = {
  skinTone: '#f1c5a7',
  hairColor: '#3a2a20',
  eyeColor: '#332a22',
  mouthColor: '#b85a66',
  bgColor: '#ffd8c9',
  hairStyle: 'short',
  eyeStyle: 'round',
  mouthStyle: 'smile',
  accessory: 'none',
};

export const memojiPresets = [
  {
    id: 'sunny',
    label: 'Sunny',
    config: {
      skinTone: '#f4c9aa',
      hairColor: '#3a2518',
      eyeColor: '#2a1f17',
      mouthColor: '#c25b6a',
      bgColor: '#ffe2bf',
      hairStyle: 'short',
      eyeStyle: 'round',
      mouthStyle: 'smile',
      accessory: 'none',
    },
  },
  {
    id: 'mint',
    label: 'Mint',
    config: {
      skinTone: '#eebea0',
      hairColor: '#151821',
      eyeColor: '#1a1f2c',
      mouthColor: '#a74f62',
      bgColor: '#c9f5ec',
      hairStyle: 'bob',
      eyeStyle: 'happy',
      mouthStyle: 'grin',
      accessory: 'glasses',
    },
  },
  {
    id: 'sky',
    label: 'Sky',
    config: {
      skinTone: '#f3c6a0',
      hairColor: '#5a402e',
      eyeColor: '#312219',
      mouthColor: '#c55d65',
      bgColor: '#cde7ff',
      hairStyle: 'curly',
      eyeStyle: 'round',
      mouthStyle: 'open',
      accessory: 'blush',
    },
  },
  {
    id: 'rose',
    label: 'Rose',
    config: {
      skinTone: '#efbf9e',
      hairColor: '#362824',
      eyeColor: '#2a1f1b',
      mouthColor: '#b04f61',
      bgColor: '#ffd4df',
      hairStyle: 'bun',
      eyeStyle: 'wink',
      mouthStyle: 'smile',
      accessory: 'earring',
    },
  },
];

export const memojiStyleOptions = {
  skinTone: ['#f7d6bd', '#f1c5a7', '#e8b895', '#d99f77', '#bd8158', '#8f5f42'],
  hairColor: ['#1b1412', '#3a2a20', '#5d4536', '#8f6a52', '#b08968', '#2f2f46'],
  eyeColor: ['#1e1613', '#2b221d', '#4a351f', '#2d3e59', '#355c52'],
  mouthColor: ['#a94b5d', '#b85a66', '#ca6b75', '#9e4650'],
  bgColor: ['#ffe2bf', '#ffd8c9', '#d8f7ef', '#cde7ff', '#f8d7e6', '#e4ddff'],
  hairStyle: ['short', 'bob', 'curly', 'bun'],
  eyeStyle: ['round', 'happy', 'wink'],
  mouthStyle: ['smile', 'grin', 'open'],
  accessory: ['none', 'glasses', 'blush', 'earring'],
};

export const normalizeMemoji = (value) => {
  if (!value || typeof value !== 'object') {
    return { ...defaultMemoji };
  }

  return {
    ...defaultMemoji,
    ...value,
  };
};
