import colors from './colors.json';

export const POWER_ON_DATA = new Uint8Array([0xcc, 0x23, 0x33]);
export const POWER_OFF_DATA = new Uint8Array([0xcc, 0x24, 0x33]);

export const DEFAULT_COLOR = { r: 255, g: 0, b: 0 };

export const COLORS_MAP = new Map(colors.map(i => [i.name, i.color]));

const FACE_API_EMOTION = {
  ANGRY: 'angry',
  DISGUSTED: 'disgusted',
  FEARFUL: 'fearful',
  HAPPY: 'happy',
  NEUTRAL: 'neutral',
  SAD: 'sad',
  SURPRISED: 'surprised',
};

export const EMOTION_COLORS = {
  [FACE_API_EMOTION.ANGRY]: { r: 255, g: 0, b: 0 },
  [FACE_API_EMOTION.DISGUSTED]: { r: 191, g: 255, b: 0 },
  [FACE_API_EMOTION.FEARFUL]: { r: 128, g: 128, b: 128 },
  [FACE_API_EMOTION.HAPPY]: { r: 255, g: 255, b: 0 },
  [FACE_API_EMOTION.NEUTRAL]: { r: 64, g: 64, b: 64 },
  [FACE_API_EMOTION.SAD]: { r: 0, g: 0, b: 255 },
  [FACE_API_EMOTION.SURPRISED]: { r: 255, g: 192, b: 203 },
};

export const EMOTION_EMOJI = {
  [FACE_API_EMOTION.ANGRY]: '😠',
  [FACE_API_EMOTION.DISGUSTED]: '😖',
  [FACE_API_EMOTION.FEARFUL]: '😨',
  [FACE_API_EMOTION.HAPPY]: '😊',
  [FACE_API_EMOTION.NEUTRAL]: '😐',
  [FACE_API_EMOTION.SAD]: '😥',
  [FACE_API_EMOTION.SURPRISED]: '😮',
};

export const APP_MODE = {
  DEFAULT: 'default',
  RANDOM_COLOR: 'random_color',
  SPEECH: 'speech',
  EMOTION: 'emotion',
  SOUND_BOX: 'sound_box',
};
