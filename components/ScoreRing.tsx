'use client'

import { useEffect, useRef } from 'react'

interface ScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
  color?: string
}

export default function ScoreRing({
  score,
  size = 140,
  strokeWidth = 10,
  label,
  sublabel,
  color,
}: ScoreRingProps) {
  const circleRef = useRef<SVGCircleElement>(null)
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference - (score / 100) * circumference

  const getColor = () => {
    if (color) return color
    if (score >= 80) return '#00FF8A'
    if (score >= 60) return '#AAFF3E'
    if (score >= 40) return '#FFB740'
    return '#FF4040'
  }

  const getGrade = () => {
    if (score >= 90) return 'A'
    if (score >= 75) return 'B'
    if (score >= 60) return 'C'
    if (score >= 45) return 'D'
    return 'F'
  }

  const ringColor = getColor()

  useEffect(() => {
    const circle = circleRef.current
    if (!circle) return
    circle.style.strokeDasharray = `${circumference}`
    circle.style.strokeDashoffset = `${circumference}`
    const timeout = setTimeout(() => {
      circle.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1)'
      circle.style.strokeDashoffset = `${dashOffset}`
    }, 300)
    return () => clearTimeout(timeout)
  }, [score, circumference, dashOffset])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Glow effect */}
        <svg
          width={size}
          height={size}
          className="absolute inset-0 opacity-30"
          style={{ filter: `blur(8px)` }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference}`}
            strokeDashoffset={`${dashOffset}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>

        <svg width={size} height={size} className="relative z-10">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            ref={circleRef}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display leading-none"
            style={{
              fontSize: size * 0.28,
              color: ringColor,
              textShadow: `0 0 20px ${ringColor}60`,
            }}
          >
            {score}
          </span>
          <span
            className="font-mono text-xs mt-0.5"
            style={{ color: ringColor, opacity: 0.7, fontSize: size * 0.1 }}
          >
            GRADE {getGrade()}
          </span>
        </div>
      </div>

      {label && (
        <div className="text-center">
          <p className="text-heading text-sm font-medium">{label}</p>
          {sublabel && <p className="text-muted text-xs mt-0.5">{sublabel}</p>}
        </div>
      )}
    </div>
  )
}
