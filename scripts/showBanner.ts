#!/usr/bin/env tsx
import { displayBanner, displayCompactLogo, displayStartupInfo } from '../src/utils/banner.js';

// Clear console
console.clear();

// Display the main banner
displayBanner();

// Display startup info (example port)
displayStartupInfo(5001);

// Also show the compact version
console.log('\n\n--- Compact Version ---\n');
displayCompactLogo();