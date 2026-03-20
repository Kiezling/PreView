import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateTargetId() {
  const chars = Math.random().toString(36).substring(2, 10).padEnd(4, '0').toUpperCase();
  return `${chars.substring(0, 2)}-${chars.substring(2, 4)}`;
}
