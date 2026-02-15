/// <reference types="vite/client" />

declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string
          preload?: string
          partition?: string
          allowpopups?: boolean
          nodeintegration?: boolean
        },
        HTMLElement
      >
    }
  }
}
