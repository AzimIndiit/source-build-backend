/**
 * Parse duration string to milliseconds
 * @param duration - Duration string (e.g., '7d', '30d', '1h', '15m')
 * @returns Duration in milliseconds
 */
export const parseDuration = (duration: string): number => {
  const regex = /^(\d+)([dhms])$/;
  const match = duration.match(regex);
  
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 'd': // days
      return value * 24 * 60 * 60 * 1000;
    case 'h': // hours
      return value * 60 * 60 * 1000;
    case 'm': // minutes
      return value * 60 * 1000;
    case 's': // seconds
      return value * 1000;
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }
};