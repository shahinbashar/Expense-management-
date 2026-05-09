import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ExpenseStatus, UserRole } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatDateShort(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export const STATUS_LABELS: Record<ExpenseStatus, string> = {
  pending: 'Pending',
  partially_approved: 'Partially Approved',
  fully_approved: 'Awaiting Super Admin',
  super_admin_approved: 'Super Admin Approved',
  completed: 'Completed',
  rejected: 'Rejected',
}

export const STATUS_COLORS: Record<ExpenseStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  partially_approved: 'bg-blue-100 text-blue-800 border-blue-200',
  fully_approved: 'bg-purple-100 text-purple-800 border-purple-200',
  super_admin_approved: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  editor: 'bg-gray-100 text-gray-800',
}
