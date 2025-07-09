// global.d.ts
import * as React from 'react';

declare global {
  namespace JSX {
    type IntrinsicElements = React.JSX.IntrinsicElements;
  }
}
