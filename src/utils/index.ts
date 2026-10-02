import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Joins class names and resolves Tailwind conflicts (e.g. "p-2 p-4" keeps only "p-4").
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs))
}
