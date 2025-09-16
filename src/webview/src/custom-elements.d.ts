import React from 'react';
import { ModelViewerAttributes } from '@google/model-viewer';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & ModelViewerAttributes, HTMLElement>;
    }
  }
}