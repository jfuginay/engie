/// <reference types="vite/client" />

import type { EngieAPI } from './preload/preload';

declare global {
  interface Window {
    engieAPI: EngieAPI;
  }
}
