/**
 * Flag Icons
 * 
 * SVG flag icon components for language selection.
 * These icons use fill colors instead of strokes.
 * 
 * Validates: Requirements 5.8, 5.9
 */

import React from 'react';
import Svg, { Rect, Circle, Path, G } from 'react-native-svg';
import { IconProps } from './CaseIcons';

const DEFAULT_SIZE = 24;

/**
 * FlagES - Spanish Flag
 * 
 * Red-yellow-red horizontal stripes.
 */
export const FlagES: React.FC<IconProps> = ({
  size = DEFAULT_SIZE,
}) => {
  const width = size;
  const height = size * 0.67; // Standard flag ratio
  
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 16"
    >
      {/* Top red stripe */}
      <Rect x="0" y="0" width="24" height="4" fill="#C60B1E" />
      {/* Middle yellow stripe (larger) */}
      <Rect x="0" y="4" width="24" height="8" fill="#FFC400" />
      {/* Bottom red stripe */}
      <Rect x="0" y="12" width="24" height="4" fill="#C60B1E" />
      {/* Border */}
      <Rect 
        x="0.5" 
        y="0.5" 
        width="23" 
        height="15" 
        fill="none" 
        stroke="#E0E0E0" 
        strokeWidth="0.5" 
      />
    </Svg>
  );
};

/**
 * FlagUS - United States Flag
 * 
 * Simplified with stripes and blue canton with stars area.
 */
export const FlagUS: React.FC<IconProps> = ({
  size = DEFAULT_SIZE,
}) => {
  const width = size;
  const height = size * 0.67;
  
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 16"
    >
      {/* Red and white stripes */}
      <Rect x="0" y="0" width="24" height="16" fill="#FFFFFF" />
      <Rect x="0" y="0" width="24" height="1.23" fill="#B22234" />
      <Rect x="0" y="2.46" width="24" height="1.23" fill="#B22234" />
      <Rect x="0" y="4.92" width="24" height="1.23" fill="#B22234" />
      <Rect x="0" y="7.38" width="24" height="1.23" fill="#B22234" />
      <Rect x="0" y="9.84" width="24" height="1.23" fill="#B22234" />
      <Rect x="0" y="12.3" width="24" height="1.23" fill="#B22234" />
      <Rect x="0" y="14.77" width="24" height="1.23" fill="#B22234" />
      {/* Blue canton */}
      <Rect x="0" y="0" width="9.6" height="8.6" fill="#3C3B6E" />
      {/* Simplified stars (dots) */}
      <G fill="#FFFFFF">
        <Circle cx="1.5" cy="1.5" r="0.5" />
        <Circle cx="3.5" cy="1.5" r="0.5" />
        <Circle cx="5.5" cy="1.5" r="0.5" />
        <Circle cx="7.5" cy="1.5" r="0.5" />
        <Circle cx="2.5" cy="3" r="0.5" />
        <Circle cx="4.5" cy="3" r="0.5" />
        <Circle cx="6.5" cy="3" r="0.5" />
        <Circle cx="1.5" cy="4.5" r="0.5" />
        <Circle cx="3.5" cy="4.5" r="0.5" />
        <Circle cx="5.5" cy="4.5" r="0.5" />
        <Circle cx="7.5" cy="4.5" r="0.5" />
        <Circle cx="2.5" cy="6" r="0.5" />
        <Circle cx="4.5" cy="6" r="0.5" />
        <Circle cx="6.5" cy="6" r="0.5" />
        <Circle cx="1.5" cy="7.5" r="0.5" />
        <Circle cx="3.5" cy="7.5" r="0.5" />
        <Circle cx="5.5" cy="7.5" r="0.5" />
        <Circle cx="7.5" cy="7.5" r="0.5" />
      </G>
      {/* Border */}
      <Rect 
        x="0.5" 
        y="0.5" 
        width="23" 
        height="15" 
        fill="none" 
        stroke="#E0E0E0" 
        strokeWidth="0.5" 
      />
    </Svg>
  );
};

/**
 * FlagBR - Brazilian Flag
 * 
 * Green background with yellow diamond and blue circle.
 */
export const FlagBR: React.FC<IconProps> = ({
  size = DEFAULT_SIZE,
}) => {
  const width = size;
  const height = size * 0.67;
  
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 16"
    >
      {/* Green background */}
      <Rect x="0" y="0" width="24" height="16" fill="#009739" />
      {/* Yellow diamond */}
      <Path 
        d="M12 1.5 L22 8 L12 14.5 L2 8 Z" 
        fill="#FEDD00" 
      />
      {/* Blue circle */}
      <Circle cx="12" cy="8" r="4" fill="#002776" />
      {/* White band across circle (simplified) */}
      <Path 
        d="M8.5 7.5 Q12 6 15.5 8.5" 
        fill="none" 
        stroke="#FFFFFF" 
        strokeWidth="0.8" 
      />
      {/* Border */}
      <Rect 
        x="0.5" 
        y="0.5" 
        width="23" 
        height="15" 
        fill="none" 
        stroke="#E0E0E0" 
        strokeWidth="0.5" 
      />
    </Svg>
  );
};
