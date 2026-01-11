// PETSCII codes: https://sta.c64.org/cbm64pet.html

// Colors
export const PETSCII = {
  // Primary colors
  WHITE: String.fromCharCode(5),
  RED: String.fromCharCode(28),
  GREEN: String.fromCharCode(30),
  BLUE: String.fromCharCode(31),
  ORANGE: String.fromCharCode(129),
  BLACK: String.fromCharCode(144),
  PINK: String.fromCharCode(150),

  // Extended colors
  DARK_GREY: String.fromCharCode(151),
  GREY: String.fromCharCode(152),
  LIGHT_GREEN: String.fromCharCode(153),
  LIGHT_BLUE: String.fromCharCode(154),
  LIGHT_GREY: String.fromCharCode(155),
  PURPLE: String.fromCharCode(156),
  YELLOW: String.fromCharCode(158),
  CYAN: String.fromCharCode(159),

  // Cursor control
  CURSOR_DOWN: String.fromCharCode(17),
  CURSOR_RIGHT: String.fromCharCode(29),
  CURSOR_UP: String.fromCharCode(91),
  CURSOR_LEFT: String.fromCharCode(157),

  // Display control
  REVERSE_ON: String.fromCharCode(18),
  REVERSE_OFF: String.fromCharCode(146),
  CLEAR: String.fromCharCode(147),
  HOME: String.fromCharCode(19),
  DELETE: String.fromCharCode(20),
  RETURN: String.fromCharCode(13),

  // Special characters
  UP_UNDERSCORE: String.fromCharCode(163),
  CARD_PIC_01: String.fromCharCode(97),
  CARD_PIC_02: String.fromCharCode(120),
  CARD_PIC_03: String.fromCharCode(122),
  CIRCLE: String.fromCharCode(113),
  EMPTY_CIRCLE: String.fromCharCode(119),
  HEART: String.fromCharCode(115),

  // Frame characters
  ROUND_TOP_LEFT: String.fromCharCode(117),
  ROUND_TOP_RIGHT: String.fromCharCode(105),
  ROUND_BOTTOM_LEFT: String.fromCharCode(106),
  ROUND_BOTTOM_RIGHT: String.fromCharCode(107),
} as const;

// Allowed characters for C64 display
export const ALLOWED_CHARS_PATTERN =
  /[,.\-_0-9a-zA-Z:;!?*~$&#@(){}+=<>[\]'/"% ]*/g;
