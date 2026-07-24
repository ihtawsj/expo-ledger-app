export const light = {
  ink: '#0F3D3E',
  inkDeep: '#0A2422',
  paper: '#FAF8F3',
  paper2: '#F1ECE0',
  gold: '#D9A441',
  goldDeep: '#B9822B',
  green: '#3F7D5C',
  red: '#C1543C',
  line: '#DCD5C4',
  text: '#20302E',
  muted: '#6B7A76',
  tabBar: '#0F3D3E',
  tabActive: '#D9A441',
  tabInactive: '#8FA6A0',
};

export const dark = {
  ink: '#FFFFFF',
  inkDeep: '#000000',
  paper: '#000000',
  paper2: '#141414',
  gold: '#D9A441',
  goldDeep: '#B9822B',
  green: '#D9A441',
  red: '#E06B55',
  line: '#262626',
  text: '#F2F2F2',
  muted: '#8A8A8A',
  tabBar: '#000000',
  tabActive: '#D9A441',
  tabInactive: '#666666',
};

export function getTheme(darkMode) {
  return darkMode ? dark : light;
}
