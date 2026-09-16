import { useEffect, useRef, useState } from "react";

interface Props {
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "hero";
  className?: string;
  color?: string;
  interactive?: boolean;
  onClick?: () => void;
  title?: string;
}

// 10 columns (x: 0..9) x 12 rows (y: 0..11)
// Minimalist sitting bunny silhouette constructed purely from circular dots
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

export function DottedRabbit({
  size = "md",
  className = "",
  color = "var(--primary)",
  interactive = false,
  onClick,
  title,
}: Props) {
  const [rippleKey, setRippleKey] = useState(0);
  const [isHopping, setIsHopping] = useState(false);
  const lastClickRef = useRef(0);
  const hopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hopTimerRef.current) clearTimeout(hopTimerRef.current);
    };
  }, []);

  const handleClick = () => {
    if (!interactive) return;
    const now = Date.now();
    const timeSinceLast = now - lastClickRef.current;
    lastClickRef.current = now;

    // Trigger dot ripple wave from center
    setRippleKey((prev) => prev + 1);

    // Rapid double/repeated click triggers gentle hop
    if (timeSinceLast < 480 && !isHopping) {
      setIsHopping(true);
      if (hopTimerRef.current) clearTimeout(hopTimerRef.current);
      hopTimerRef.current = setTimeout(() => {
        setIsHopping(false);
      }, 650);
    }

    onClick?.();
  };

  // Dimension and dot radius configs
  const config = {
    sm: { width: 22, height: 26, spacing: 2.1, r: 0.85, offsetX: 1.5, offsetY: 1.5 },
    md: { width: 38, height: 45, spacing: 3.6, r: 1.45, offsetX: 2.5, offsetY: 2.5 },
    lg: { width: 50, height: 60, spacing: 4.8, r: 1.9, offsetX: 3.5, offsetY: 3.5 },
    xl: { width: 154, height: 184, spacing: 15, r: 5.6, offsetX: 14, offsetY: 14 },
    "2xl": { width: 240, height: 288, spacing: 23.5, r: 8.8, offsetX: 20, offsetY: 20 },
    hero: { width: 280, height: 336, spacing: 27.5, r: 10.2, offsetX: 24, offsetY: 24 },
  }[size];

  const { width, height, spacing, r, offsetX, offsetY } = config;

  const renderDot = (x: number, y: number, keyPrefix: string, isEye = false) => {
    // Distance from center of mass [5, 6] for radial ripple delay
    const dist = Math.hypot(x - 5, y - 6);
    const delayMs = Math.round(dist * 36);
    const dotRadius = isEye ? r * 0.95 : r;

    return (
      <circle
        key={`${rippleKey}-${keyPrefix}-${x}-${y}`}
        cx={x * spacing + offsetX}
        cy={y * spacing + offsetY}
        r={dotRadius}
        fill={color}
        className={`${isEye ? "rabbit-eye " : ""}${rippleKey > 0 ? "dot-ripple" : ""}`}
        style={rippleKey > 0 ? { animationDelay: `${delayMs}ms` } : undefined}
      />
    );
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none transition-transform ${isHopping ? "rabbit-hop" : ""} ${
        interactive ? "cursor-pointer hover:scale-[1.03] active:scale-[0.98] outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-4 rounded-2xl" : ""
      } ${className}`}
      aria-hidden={!interactive}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? title || "Trakker animated dotted rabbit" : undefined}
      onClick={interactive ? handleClick : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
    >
      {interactive && <title>{title || "Click or double-click to play with the rabbit"}</title>}
      {/* Ears with subtle twitch animation */}
      <g className="rabbit-ears">
        {EARS_DOTS.map(([x, y]) => renderDot(x, y, "ear"))}
      </g>

      {/* Head dots */}
      <g className="rabbit-head">
        {HEAD_DOTS.map(([x, y]) => renderDot(x, y, "head"))}
        {/* Eye dot with subtle blink animation and ripple */}
        {renderDot(EYE_DOT[0], EYE_DOT[1], "eye", true)}
      </g>

      {/* Body dots with subtle breathing animation */}
      <g className="rabbit-body">
        {BODY_DOTS.map(([x, y]) => renderDot(x, y, "body"))}
      </g>
    </svg>
  );
}
