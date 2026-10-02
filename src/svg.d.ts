// Tells TypeScript what `import ... from "./x.svg?react"` returns (see vite.config.ts).
declare module '*.svg?react' {
  import type { FC, SVGProps } from 'react'
  export const ReactComponent: FC<SVGProps<SVGSVGElement>>
  const src: string
  export default src
}
