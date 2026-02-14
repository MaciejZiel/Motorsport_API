import fs from 'node:fs';
import path from 'node:path';

const minimumCoverage = Number(process.env.FRONTEND_COVERAGE_MIN || '66');
const rootDir = process.cwd();
const lcovCandidates = [
  path.join(rootDir, 'coverage', 'lcov.info'),
  path.join(rootDir, 'coverage', 'motorsport-frontend', 'lcov.info'),
];
const jsonCandidates = [
  path.join(rootDir, 'coverage', 'coverage-final.json'),
  path.join(rootDir, 'coverage', 'motorsport-frontend', 'coverage-final.json'),
];

const lcovPath = lcovCandidates.find((candidate) => fs.existsSync(candidate));
const jsonPath = jsonCandidates.find((candidate) => fs.existsSync(candidate));

let coverage;
if (lcovPath) {
  const lines = fs.readFileSync(lcovPath, 'utf8').split('\n');
  let totalFound = 0;
  let totalHit = 0;

  for (const line of lines) {
    if (line.startsWith('LF:')) {
      totalFound += Number(line.slice(3));
    } else if (line.startsWith('LH:')) {
      totalHit += Number(line.slice(3));
    }
  }

  if (totalFound === 0) {
    console.error('Coverage report is empty (LF=0).');
    process.exit(1);
  }

  coverage = (totalHit / totalFound) * 100;
} else if (jsonPath) {
  const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  let totalStatements = 0;
  let coveredStatements = 0;

  for (const fileCoverage of Object.values(payload)) {
    const statementHits = Object.values(fileCoverage.s);
    totalStatements += statementHits.length;
    coveredStatements += statementHits.filter((value) => Number(value) > 0).length;
  }

  if (totalStatements === 0) {
    console.error('Coverage report is empty (statements=0).');
    process.exit(1);
  }

  coverage = (coveredStatements / totalStatements) * 100;
} else {
  console.error('Coverage report not found. Expected lcov.info or coverage-final.json.');
  process.exit(1);
}

const roundedCoverage = Number(coverage.toFixed(2));

if (coverage < minimumCoverage) {
  console.error(
    `Frontend coverage check failed: ${roundedCoverage}% < required ${minimumCoverage}%.`
  );
  process.exit(1);
}

console.log(`Frontend coverage check passed: ${roundedCoverage}% (minimum ${minimumCoverage}%).`);
