interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
  color?: string;
}

// 10 columns (x: 0..9) x 12 rows (y: 0..11)
// Grid layout optimized for a minimalist sitting bunny silhouette
const EARS_DOTS: [number, number][] = [
  // Left ear (taller, foreground)
  [4, 0],
  [4, 1],
  [4, 2],
  [4, 3],
  [5, 1],
  [5, 2],
  [5, 3],
  // Right ear (slightly angled back)
  [7, 1],
  [7, 2],
  [7, 3],
  [8, 2],
  [8, 3],
];

const HEAD_DOTS: [number, number][] = [
  // Head upper
  [4, 4],
  [5, 4],
  [6, 4],
  [7, 4],
  // Snout & face (snout points right at [8, 5])
  [3, 5],
  [4, 5],
  [5, 5],
  [7, 5],
  [8, 5],
  // Head lower / chin
  [4, 6],
  [5, 6],
  [6, 6],
  [7, 6],
];

const EYE_DOT: [number, number] = [6, 5];

const BODY_DOTS: [number, number][] = [
  // Neck
  [4, 7],
  [5, 7],
  [6, 7],
  // Upper back & chest
  [3, 8],
  [4, 8],
  [5, 8],
  [6, 8],
  [7, 8],
  // Mid body
  [1, 9],
  [2, 9],
  [3, 9],
  [4, 9],
  [5, 9],
  [6, 9],
  [7, 9],
  // Fluffy round tail
  [0, 9],
  [0, 10],
  // Lower body
  [1, 10],
  [2, 10],
  [3, 10],
  [4, 10],
  [5, 10],
  [6, 10],
  // Back foot / paw
  [2, 11],
  [3, 11],
  // Front paw
  [6, 11],
  [7, 11],
];

export function DottedRabbit({ size = "md", className = "", color = "var(--primary)" }: Props) {
  // Dimensions and dot radius
  const config = {
    sm: { width: 22, height: 26, spacing: 2.1, r: 0.85, offsetX: 1.5, offsetY: 1.5 },
    md: { width: 38, height: 45, spacing: 3.6, r: 1.45, offsetX: 2.5, offsetY: 2.5 },
    lg: { width: 50, height: 60, spacing: 4.8, r: 1.9, offsetX: 3.5, offsetY: 3.5 },
  }[size];

  const { width, height, spacing, r, offsetX, offsetY } = config;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      aria-hidden="true"
    >
      {/* Ears with subtle twitch animation */}
      <g className="rabbit-ears">
        {EARS_DOTS.map(([x, y]) => (
          <circle
            key={`ear-${x}-${y}`}
            cx={x * spacing + offsetX}
            cy={y * spacing + offsetY}
            r={r}
            fill={color}
          />
        ))}
      </g>

      {/* Head dots */}
      <g className="rabbit-head">
        {HEAD_DOTS.map(([x, y]) => (
          <circle
            key={`head-${x}-${y}`}
            cx={x * spacing + offsetX}
            cy={y * spacing + offsetY}
            r={r}
            fill={color}
          />
        ))}
        {/* Eye dot with subtle blink animation */}
        <circle
          className="rabbit-eye"
          cx={EYE_DOT[0] * spacing + offsetX}
          cy={EYE_DOT[1] * spacing + offsetY}
          r={r * 0.95}
          fill={color}
        />
      </g>

      {/* Body dots with subtle breathing animation */}
      <g className="rabbit-body">
        {BODY_DOTS.map(([x, y]) => (
          <circle
            key={`body-${x}-${y}`}
            cx={x * spacing + offsetX}
            cy={y * spacing + offsetY}
            r={r}
            fill={color}
          />
        ))}
      </g>
    </svg>
  );
}
