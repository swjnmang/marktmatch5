/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get current date and time
// WICHTIG: Build-Server (z.B. Vercel) laufen in UTC, lokale Rechner in der jeweiligen
// Systemzeitzone - ohne feste timeZone würde der angezeigte Zeitstempel je nachdem, wo
// gebaut wurde, um mehrere Stunden abweichen. 'Europe/Berlin' berücksichtigt auch die
// Sommerzeit automatisch.
const now = new Date();
const dateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' });
const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
const isoDate = now.toISOString();

// Get commit hash
let commitHash = 'dev';
try {
  commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch {
  console.warn('Could not get git commit hash');
}

// Get version from package.json
const packageJson = require('./package.json');
const version = packageJson.version;

// Generate version file content
const versionFileContent = `// Auto-generated version file - DO NOT EDIT MANUALLY
// Updated automatically on each commit

export const VERSION = {
  number: '${version}',
  date: '${dateStr}',
  time: '${timeStr}',
  commit: '${commitHash}',
  buildDate: new Date('${isoDate}'),
};
`;

// Write version file
const versionFilePath = path.join(__dirname, 'src', 'lib', 'version.ts');
fs.writeFileSync(versionFilePath, versionFileContent, 'utf8');

console.log(`✓ Version updated: ${version} (${dateStr} ${timeStr})`);
