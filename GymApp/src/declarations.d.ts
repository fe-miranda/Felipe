declare module 'react-native-svg' {
  import React from 'react';
  import { ViewProps, GestureResponderEvent } from 'react-native';

  interface CommonSvgProps {
    id?: string;
    fill?: string;
    fillOpacity?: number | string;
    fillRule?: 'nonzero' | 'evenodd';
    stroke?: string;
    strokeWidth?: number | string;
    strokeOpacity?: number | string;
    strokeLinecap?: 'butt' | 'round' | 'square';
    strokeLinejoin?: 'miter' | 'round' | 'bevel';
    strokeDasharray?: string | number[];
    strokeDashoffset?: number | string;
    opacity?: number | string;
    transform?: string;
    clipPath?: string;
    clipRule?: 'nonzero' | 'evenodd';
    onPress?: (event: GestureResponderEvent) => void;
    onLongPress?: (event: GestureResponderEvent) => void;
  }

  export interface SvgProps extends CommonSvgProps, ViewProps {
    width?: number | string;
    height?: number | string;
    viewBox?: string;
    preserveAspectRatio?: string;
    color?: string;
  }

  export interface PathProps extends CommonSvgProps {
    d?: string;
  }

  export interface CircleProps extends CommonSvgProps {
    cx?: number | string;
    cy?: number | string;
    r?: number | string;
  }

  export interface EllipseProps extends CommonSvgProps {
    cx?: number | string;
    cy?: number | string;
    rx?: number | string;
    ry?: number | string;
  }

  export interface RectProps extends CommonSvgProps {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    rx?: number | string;
    ry?: number | string;
  }

  export interface GProps extends CommonSvgProps {
    children?: React.ReactNode;
  }

  export interface DefsProps {
    children?: React.ReactNode;
  }

  export interface LinearGradientProps {
    id?: string;
    x1?: string | number;
    y1?: string | number;
    x2?: string | number;
    y2?: string | number;
    gradientUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
    children?: React.ReactNode;
  }

  export interface StopProps {
    offset?: string | number;
    stopColor?: string;
    stopOpacity?: number | string;
  }

  export interface ClipPathProps {
    id?: string;
    children?: React.ReactNode;
  }

  export interface TextProps extends CommonSvgProps {
    x?: string | number;
    y?: string | number;
    textAnchor?: 'start' | 'middle' | 'end';
    fontSize?: number | string;
    fontWeight?: string | number;
    children?: React.ReactNode;
  }

  const Svg: React.ComponentType<SvgProps>;
  const Path: React.ComponentType<PathProps>;
  const Circle: React.ComponentType<CircleProps>;
  const Ellipse: React.ComponentType<EllipseProps>;
  const Rect: React.ComponentType<RectProps>;
  const G: React.ComponentType<GProps>;
  const Defs: React.ComponentType<DefsProps>;
  const LinearGradient: React.ComponentType<LinearGradientProps>;
  const Stop: React.ComponentType<StopProps>;
  const ClipPath: React.ComponentType<ClipPathProps>;
  const Text: React.ComponentType<TextProps>;

  export default Svg;
  export { Svg, Path, Circle, Ellipse, Rect, G, Defs, LinearGradient, Stop, ClipPath, Text };
}

declare module 'expo-image-picker' {
  export enum MediaTypeOptions {
    All = 'All',
    Videos = 'Videos',
    Images = 'Images',
  }

  export interface ImagePickerOptions {
    mediaTypes?: MediaTypeOptions | string;
    allowsEditing?: boolean;
    allowsMultipleSelection?: boolean;
    aspect?: [number, number];
    quality?: number;
    base64?: boolean;
    exif?: boolean;
    videoMaxDuration?: number;
  }

  export interface ImagePickerAsset {
    uri: string;
    width?: number;
    height?: number;
    base64?: string;
    mimeType?: string;
    type?: 'image' | 'video';
    fileName?: string;
    fileSize?: number;
    exif?: Record<string, unknown>;
  }

  export interface ImagePickerResult {
    canceled: boolean;
    assets: ImagePickerAsset[];
  }

  export function launchImageLibraryAsync(options?: ImagePickerOptions): Promise<ImagePickerResult>;
  export function launchCameraAsync(options?: ImagePickerOptions): Promise<ImagePickerResult>;
  export function requestMediaLibraryPermissionsAsync(): Promise<{ status: string; granted: boolean }>;
  export function requestCameraPermissionsAsync(): Promise<{ status: string; granted: boolean }>;
}

declare module 'expo-print' {
  export interface PrintOptions {
    html?: string;
    uri?: string;
    width?: number;
    height?: number;
    base64?: boolean;
    useMarkupFormatter?: boolean;
  }

  export interface FilePrintResult {
    uri: string;
    numberOfPages?: number;
    base64?: string;
  }

  export function printAsync(options: PrintOptions): Promise<void>;
  export function printToFileAsync(options?: PrintOptions): Promise<FilePrintResult>;
}
