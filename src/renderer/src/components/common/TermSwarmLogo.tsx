export function TermSwarmLogo({ size = 14 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      width={size}
      height={size}
    >
      <polygon
        points="200,32 343,117 343,283 200,368 57,283 57,117"
        fill="none"
        stroke="#00E5FF"
        strokeWidth="14"
        strokeLinejoin="round"
      />
      <polygon
        points="200,68 315,134 315,266 200,332 85,266 85,134"
        fill="#2B3040"
        stroke="#3D4D60"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <polyline
        points="155,148 182,164 155,180"
        fill="none"
        stroke="#00E5FF"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="202"
        y1="164"
        x2="234"
        y2="164"
        stroke="#7C3AED"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <polyline
        points="155,188 182,204 155,220"
        fill="none"
        stroke="#00E5FF"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="202"
        y1="204"
        x2="234"
        y2="204"
        stroke="#00E5FF"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <polyline
        points="155,228 182,244 155,260"
        fill="none"
        stroke="#00E5FF"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
