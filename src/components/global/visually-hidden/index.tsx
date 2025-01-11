import { ReactNode } from "react"

interface VisuallyHiddenProps {
  children: ReactNode
}

export const VisuallyHidden = ({ children }: VisuallyHiddenProps) => {
  return (
    <span
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: "0",
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        border: "0",
      }}
    >
      {children}
    </span>
  )
}
