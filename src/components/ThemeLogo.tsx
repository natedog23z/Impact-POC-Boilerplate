'use client'

import Image from 'next/image'
import { useTheme } from './ThemeProvider'

interface ThemeLogoProps {
  width?: number
  height?: number
  style?: React.CSSProperties
  className?: string
}

export function ThemeLogo({ width = 140, height = 33, style, className }: ThemeLogoProps) {
  const { isDark } = useTheme()

  return (
    <Image
      src={isDark ? '/images/gloo-impact-logo-dark.svg' : '/images/gloo-impact-logo-light.svg'}
      alt="Gloo Impact"
      width={width}
      height={height}
      style={style}
      className={className}
    />
  )
}
