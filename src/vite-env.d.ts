/// <reference types="vite/client" />
/// <reference types="@testing-library/jest-dom/vitest" />

declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
  const url: string;
  export default url;
}
