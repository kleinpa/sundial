/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GA_TRACKING_ID: string;
  readonly VITE_VERSION: string;
  readonly VITE_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
