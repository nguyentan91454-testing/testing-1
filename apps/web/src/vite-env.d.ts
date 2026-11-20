/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly R2_PUBLIC_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
