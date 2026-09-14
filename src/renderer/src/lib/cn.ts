import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Tailwind 类名合并：后置冲突类覆盖前置类 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
