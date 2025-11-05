/**
 * Utility functions for Carbon ACX
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with proper precedence
 * @param inputs - Class names to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format carbon emissions with appropriate units
 * @param kgCO2 - Emissions in kilograms CO2
 * @returns Formatted string with units
 */
export function formatCarbon(kgCO2: number): string {
  if (kgCO2 < 1) {
    return `${(kgCO2 * 1000).toFixed(0)} g CO₂`
  } else if (kgCO2 < 1000) {
    return `${kgCO2.toFixed(2)} kg CO₂`
  } else {
    return `${(kgCO2 / 1000).toFixed(2)} t CO₂`
  }
}

/**
 * Format a date relative to now (e.g., "2 days ago")
 * @param date - Date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - then.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}mo ago`
  return `${Math.floor(diffDay / 365)}y ago`
}

/**
 * Truncate a hash to a shorter display format
 * @param hash - Full hash string
 * @param length - Number of characters to show (default: 8)
 * @returns Truncated hash with ellipsis
 */
export function truncateHash(hash: string, length: number = 8): string {
  if (hash.length <= length) return hash
  return `${hash.slice(0, length)}...`
}

/**
 * Format bytes to human-readable size
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}
