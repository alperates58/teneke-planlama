'use client';

import React from 'react';

interface ColorChipProps {
  color: string;
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  C: { bg: '#009ee3', text: '#ffffff', border: '#0085bf' },
  M: { bg: '#e5007d', text: '#ffffff', border: '#bf0068' },
  Y: { bg: '#fff100', text: '#111827', border: '#d4c800' },
  K: { bg: '#111827', text: '#ffffff', border: '#374151' },
  '368C': { bg: '#54b948', text: '#ffffff', border: '#3d9433' },
  '357C': { bg: '#215732', text: '#ffffff', border: '#174024' },
  '1225C': { bg: '#ffc72c', text: '#111827', border: '#d9a318' },
  '185C': { bg: '#e4002b', text: '#ffffff', border: '#ba0023' },
  '7621C': { bg: '#9b2723', text: '#ffffff', border: '#781c19' },
  '364C': { bg: '#4a7729', text: '#ffffff', border: '#37591e' },
  '2587C': { bg: '#865299', text: '#ffffff', border: '#683e78' },
  '2665C': { bg: '#71388f', text: '#ffffff', border: '#54266b' },
  '198C': { bg: '#d4385a', text: '#ffffff', border: '#a82743' },
  '109C': { bg: '#ffd100', text: '#111827', border: '#d9b200' },
  '2925C': { bg: '#009cde', text: '#ffffff', border: '#007bb0' },
  '300C': { bg: '#005eb8', text: '#ffffff', border: '#00478c' },
};

export const ColorChip: React.FC<ColorChipProps> = ({ color }) => {
  const cleanColor = color.trim().toUpperCase();
  const matched = COLOR_MAP[cleanColor] || {
    bg: '#334155',
    text: '#f8fafc',
    border: '#475569',
  };

  return (
    <span
      style={{
        backgroundColor: matched.bg,
        color: matched.text,
        borderColor: matched.border,
      }}
      className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-mono font-bold rounded border shadow-sm select-none"
      title={`Renk: ${color}`}
    >
      {cleanColor}
    </span>
  );
};
