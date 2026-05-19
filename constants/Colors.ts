/**
 * Tesla Design System Colors
 * Primary: Tesla Red (#E31837) with modern supporting tones
 */

const teslaRed = '#E31837';
const teslaRedDark = '#C41230';
const tintColorLight = teslaRed;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',

    primary: teslaRed,
    primaryDark: teslaRedDark,
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8',

    cardBackground: '#f8f9fa',
    borderColor: '#e9ecef',
    textSecondary: '#6c757d',
  },
  dark: {
    text: '#ECEDEE',
    background: '#000000',
    tint: tintColorDark,
    icon: '#9BA1A6',

    primary: teslaRed,
    primaryDark: teslaRedDark,
    success: '#34d058',
    warning: '#ffdf5d',
    danger: '#f85149',
    info: '#58a6ff',

    cardBackground: '#1c1c1e',
    borderColor: '#38383a',
    textSecondary: '#98989a',
  },
};
