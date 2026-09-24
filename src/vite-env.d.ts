/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  __HDT_CHECK_SW__?: () => Promise<void>
  __HDT_UPDATE_SW__?: (reloadPage?: boolean) => Promise<void>
  __HDT_UPDATE_PENDING__?: boolean
  html2pdf?: () => {
    from: (element: HTMLElement) => {
      set: (options: Record<string, unknown>) => {
        toPdf: () => {
          outputPdf: (type: 'blob') => Promise<Blob>
        }
      }
    }
  }
}
