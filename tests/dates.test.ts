/**
 * Tests unitarios para utilidades de fechas
 */

import {
  formatDate,
  parseDate,
  getISOWeek,
  getWeekRange,
  getMonthRange,
  getDateRange,
  isWeekend,
} from '../src/utils/dates.js';

describe('Dates Utilities', () => {
  describe('formatDate', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date(2025, 9, 2); // October 2, 2025
      expect(formatDate(date)).toBe('2025-10-02');
    });

    it('should pad single digit months and days', () => {
      const date = new Date(2025, 0, 5); // January 5, 2025
      expect(formatDate(date)).toBe('2025-01-05');
    });
  });

  describe('parseDate', () => {
    it('should parse YYYY-MM-DD string to Date', () => {
      const date = parseDate('2025-10-02');
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(9); // 0-indexed
      expect(date.getDate()).toBe(2);
    });
  });

  describe('getISOWeek', () => {
    it('should calculate ISO week correctly', () => {
      const date = new Date(2025, 0, 6); // January 6, 2025 (Monday of week 2)
      const { isoYear, isoWeek } = getISOWeek(date);
      expect(isoYear).toBe(2025);
      expect(isoWeek).toBe(2);
    });

    it('should handle year boundary correctly', () => {
      const date = new Date(2024, 11, 30); // December 30, 2024
      const { isoYear, isoWeek } = getISOWeek(date);
      expect(isoYear).toBe(2025); // ISO week belongs to 2025
      expect(isoWeek).toBe(1);
    });
  });

  describe('getWeekRange', () => {
    it('should return Monday to Sunday range for ISO week', () => {
      const { start, end } = getWeekRange(2025, 2);
      expect(start.getDay()).toBe(1); // Monday
      expect(end.getDay()).toBe(0); // Sunday
      expect((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)).toBe(6);
    });
  });

  describe('getMonthRange', () => {
    it('should return first and last day of month', () => {
      const { start, end } = getMonthRange(2025, 10); // October 2025
      expect(start.getDate()).toBe(1);
      expect(end.getDate()).toBe(31);
    });

    it('should handle February correctly', () => {
      const { start, end } = getMonthRange(2025, 2); // February 2025
      expect(start.getDate()).toBe(1);
      expect(end.getDate()).toBe(28); // 2025 is not a leap year
    });

    it('should handle leap year February', () => {
      const { start, end } = getMonthRange(2024, 2); // February 2024
      expect(start.getDate()).toBe(1);
      expect(end.getDate()).toBe(29); // 2024 is a leap year
    });
  });

  describe('getDateRange', () => {
    it('should return all dates between start and end', () => {
      const start = new Date(2025, 9, 1);
      const end = new Date(2025, 9, 5);
      const dates = getDateRange(start, end);
      expect(dates).toHaveLength(5);
      expect(formatDate(dates[0])).toBe('2025-10-01');
      expect(formatDate(dates[4])).toBe('2025-10-05');
    });
  });

  describe('isWeekend', () => {
    it('should return true for Saturday', () => {
      const saturday = new Date(2025, 9, 4); // October 4, 2025 (Saturday)
      expect(isWeekend(saturday)).toBe(true);
    });

    it('should return true for Sunday', () => {
      const sunday = new Date(2025, 9, 5); // October 5, 2025 (Sunday)
      expect(isWeekend(sunday)).toBe(true);
    });

    it('should return false for weekdays', () => {
      const monday = new Date(2025, 9, 6); // October 6, 2025 (Monday)
      expect(isWeekend(monday)).toBe(false);
    });
  });
});
