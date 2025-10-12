import React from 'react';

export const LineIcon = ({ color = 'currentColor', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <line x1="3" y1="12" x2="21" y2="12" />
  </svg>
);

export const RectangleIcon = ({ color = 'currentColor', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </svg>
);

export const CircleIcon = ({ color = 'currentColor', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
  </svg>
);

export const PenIcon = ({ color = 'currentColor', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

export const EraserIcon = ({ color = 'currentColor', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M7 21l-5-5 5-5h12a2 2 0 0 1 0 4H7z" />
  </svg>
);

export const SunIcon = ({ color = 'currentColor', size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

export const MoonIcon = ({ color = 'currentColor', size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

export const ClearIcon = ({ color = 'currentColor', size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

export const IndicatorIcon = ({ color = 'currentColor', size = 16 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Main chart line */}
    <path 
      d="M3 17L7 13L10 16L14 11L17 14L21 10" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    
    {/* Moving Average line 1 - dashed */}
    <path 
      d="M3 14L7 10L10 13L14 8L17 11L21 7" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      strokeDasharray="2 2"
      opacity="0.8"
    />
    
    {/* Moving Average line 2 - dotted */}
    <path 
      d="M3 20L7 16L10 19L14 14L17 17L21 13" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      strokeDasharray="1 1"
      opacity="0.6"
    />
    
    {/* Data points/circles */}
    <circle cx="7" cy="13" r="1" fill={color} />
    <circle cx="10" cy="16" r="1" fill={color} />
    <circle cx="14" cy="11" r="1" fill={color} />
    <circle cx="17" cy="14" r="1" fill={color} />
  </svg>
);