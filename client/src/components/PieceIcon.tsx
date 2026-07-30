import React from 'react';
import type { PieceType } from '../../../shared/types';

interface Props {
  type: PieceType;
  color: string;
  size?: number;
  displayMode?: 'kanji' | 'symbols' | 'images';
}

const IMAGE_MAP: Record<PieceType, string> = {
  king: 'oh-sho.png',
  rook: 'hi-sha.png',
  bishop: 'kaku-gyo.png',
  gold: 'kin-sho.png',
  silver: 'gin-sho.png',
  knight: 'kei-ma.png',
  lance: 'kyo-sha.png',
  pawn: 'fu-hyo.png',
  promoted_rook: 'ryo-oh.png',
  promoted_bishop: 'uma.png',
  promoted_silver: 'nari-gin.png',
  promoted_knight: 'nari-kei.png',
  promoted_lance: 'nari-kyo.png',
  promoted_pawn: 'to-kin.png'
};

export const PieceIcon: React.FC<Props> = ({ type, color, size = 30, displayMode = 'kanji' }) => {
  if (displayMode === 'images') {
    const baseUrl = import.meta.env.BASE_URL;
    return (
      <img 
        src={`${baseUrl}icons/${IMAGE_MAP[type]}`} 
        width={size} 
        height={size} 
        style={{ objectFit: 'contain' }} 
        alt={type} 
      />
    );
  }

  if (displayMode === 'kanji') {
    let kanji = '';
    switch (type) {
      case 'king': kanji = '王'; break;
      case 'rook': kanji = '飛'; break;
      case 'bishop': kanji = '角'; break;
      case 'gold': kanji = '金'; break;
      case 'silver': kanji = '銀'; break;
      case 'knight': kanji = '桂'; break;
      case 'lance': kanji = '香'; break;
      case 'pawn': kanji = '歩'; break;
      case 'promoted_rook': kanji = '龍'; break;
      case 'promoted_bishop': kanji = '馬'; break;
      case 'promoted_silver': kanji = '全'; break;
      case 'promoted_knight': kanji = '圭'; break;
      case 'promoted_lance': kanji = '杏'; break;
      case 'promoted_pawn': kanji = 'と'; break;
    }
    
    // Promoted pieces are usually red, but since we use color for player, we'll just bold it or add a stroke
    const isPromoted = type.startsWith('promoted_');
    
    return (
      <svg width={size} height={size} viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
        <text 
          x="15" 
          y="21" 
          fontSize="20" 
          fontFamily="sans-serif" 
          fontWeight={isPromoted ? 'bold' : 'normal'}
          fill={color} 
          textAnchor="middle"
        >
          {kanji}
        </text>
      </svg>
    );
  }

  const renderShape = () => {
    switch (type) {
      case 'king':
        return <path d="M5 25 L10 10 L15 20 L20 10 L25 25 Z" fill={color} />;
      case 'rook':
        return <path d="M11 5 L19 5 L19 11 L25 11 L25 19 L19 19 L19 25 L11 25 L11 19 L5 19 L5 11 L11 11 Z" fill={color} />;
      case 'bishop':
        return <path d="M15 5 L25 15 L15 25 L5 15 Z" fill={color} />;
      case 'gold':
      case 'promoted_silver':
      case 'promoted_knight':
      case 'promoted_lance':
      case 'promoted_pawn':
        return <path d="M5 25 L15 5 L25 25 Z" fill={color} stroke="black" strokeWidth={type !== 'gold' ? 2 : 0} />;
      case 'silver':
        return <polygon points="15,5 25,15 20,25 10,25 5,15" fill={color} />;
      case 'knight':
        return <path d="M15 25 L15 15 L5 5 M15 15 L25 5" stroke={color} strokeWidth="5" fill="none" />;
      case 'lance':
        return <rect x="12" y="5" width="6" height="20" fill={color} />;
      case 'pawn':
        return <circle cx="15" cy="15" r="5" fill={color} />;
      case 'promoted_rook':
        return (
          <>
            <path d="M11 5 L19 5 L19 11 L25 11 L25 19 L19 19 L19 25 L11 25 L11 19 L5 19 L5 11 L11 11 Z" fill="none" stroke={color} strokeWidth="2" />
            <circle cx="15" cy="15" r="3" fill={color} />
          </>
        );
      case 'promoted_bishop':
        return (
          <>
            <path d="M15 5 L25 15 L15 25 L5 15 Z" fill="none" stroke={color} strokeWidth="2" />
            <circle cx="15" cy="15" r="3" fill={color} />
          </>
        );
      default:
        return <circle cx="15" cy="15" r="10" fill={color} />;
    }
  };

  return (
    <svg width={size} height={size} viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
      {renderShape()}
    </svg>
  );
};
