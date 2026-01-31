/**
 * Date utility functions
 */

/**
 * Safely convert a value to a Date object
 */
export function safeDate(value: unknown): Date {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      throw new Error('Invalid date value: NaN');
    }
    return value;
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date string: "${value}"`);
    }
    return date;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date number: ${value}`);
    }
    return date;
  }

  throw new Error(`Cannot convert to date: ${typeof value}`);
}
