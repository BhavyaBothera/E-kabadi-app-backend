/**
 * QA Report Generator
 * Reads vitest JSON output (qa-results.json) and generates a self-contained HTML report.
 *
 * Usage: npx tsx scripts/generate-qa-report.ts
 */
import fs from 'fs';
import path from 'path';

interface VitestResult {
  numTotalTestSuites: number;
  numPassedTestSuites: number;
  numFailedTestSuites: number;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  startTime: number;
  success: boolean;
  testResults: TestSuiteResult[];
}

interface TestSuiteResult {
  name: string;
  status: string;
  startTime: number;
  endTime: number;
  assertionResults: TestResult[];
}

interface TestResult {
  fullName: string;
  title: string;
  status: string;
  duration: number;
  failureMessages?: string[];
  ancestorTitles: string[];
}

function generateReport(): void {
  const resultsPath = path.join(__dirname, '..', 'qa-results.json');
  const outputPath = path.join(__dirname, '..', 'qa-report.html');

  if (!fs.existsSync(resultsPath)) {
    console.error('❌ qa-results.json not found. Run "npm run qa:offline" or "npm run qa" first.');
    process.exit(1);
  }

  const raw = fs.readFileSync(resultsPath, 'utf-8');
  const data: VitestResult = JSON.parse(raw);

  const now = new Date().toISOString();
  const totalDuration = data.testResults.reduce(
    (sum, s) => sum + (s.endTime - s.startTime),
    0,
  );
  const overallPass = data.success;

  // Collect all individual tests
  const allTests: Array<{
    suite: string;
    title: string;
    status: string;
    duration: number;
    error?: string;
  }> = [];

  for (const suite of data.testResults) {
    const suiteName = path.basename(suite.name);
    for (const test of suite.assertionResults) {
      allTests.push({
        suite: suiteName,
        title: test.fullName || test.title,
        status: test.status,
        duration: test.duration || 0,
        error: test.failureMessages?.join('\n'),
      });
    }
  }

  const failedTests = allTests.filter((t) => t.status === 'failed');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Kabadi QA Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: #0f1117;
      color: #e4e4e7;
      padding: 2rem;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #fff;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1.25rem;
      border-radius: 9999px;
      font-size: 1rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge.pass { background: #065f46; color: #6ee7b7; }
    .badge.fail { background: #7f1d1d; color: #fca5a5; }
    .meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .meta-card {
      background: #1a1b23;
      border: 1px solid #27272a;
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
    }
    .meta-card .label { color: #71717a; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
    .meta-card .value { font-size: 1.25rem; font-weight: 700; color: #fff; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat {
      background: #1a1b23;
      border: 1px solid #27272a;
      border-radius: 0.75rem;
      padding: 1.25rem;
      text-align: center;
    }
    .stat .num { font-size: 2rem; font-weight: 800; }
    .stat .lbl { font-size: 0.75rem; color: #71717a; text-transform: uppercase; margin-top: 0.25rem; }
    .stat.total .num { color: #818cf8; }
    .stat.passed .num { color: #6ee7b7; }
    .stat.failed .num { color: #fca5a5; }
    .stat.skipped .num { color: #fbbf24; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2rem;
    }
    th, td {
      text-align: left;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #27272a;
    }
    th { color: #71717a; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; background: #1a1b23; }
    tr:hover { background: #1e1f29; }
    .status-pass { color: #6ee7b7; font-weight: 600; }
    .status-fail { color: #fca5a5; font-weight: 600; }
    .status-skip { color: #fbbf24; font-weight: 600; }
    .error-panel {
      background: #1c1015;
      border: 1px solid #7f1d1d;
      border-radius: 0.5rem;
      padding: 1rem;
      margin: 0.5rem 0;
      font-family: 'Cascadia Code', 'Fira Code', monospace;
      font-size: 0.8rem;
      white-space: pre-wrap;
      word-break: break-all;
      color: #fca5a5;
      max-height: 300px;
      overflow-y: auto;
    }
    .suite-header {
      font-size: 1.1rem;
      font-weight: 700;
      color: #818cf8;
      padding: 1rem 0 0.5rem;
      border-bottom: 2px solid #27272a;
      margin-top: 1rem;
    }
    .footer {
      text-align: center;
      color: #52525b;
      font-size: 0.75rem;
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid #27272a;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧪 E-Kabadi QA Report</h1>
    <span class="badge ${overallPass ? 'pass' : 'fail'}">
      ${overallPass ? '✅ ALL PASSED' : '❌ FAILURES DETECTED'}
    </span>
  </div>

  <div class="meta">
    <div class="meta-card">
      <div class="label">Generated</div>
      <div class="value">${now.replace('T', ' ').slice(0, 19)}</div>
    </div>
    <div class="meta-card">
      <div class="label">Node Version</div>
      <div class="value">${process.version}</div>
    </div>
    <div class="meta-card">
      <div class="label">Total Duration</div>
      <div class="value">${(totalDuration / 1000).toFixed(1)}s</div>
    </div>
    <div class="meta-card">
      <div class="label">Test Suites</div>
      <div class="value">${data.numTotalTestSuites}</div>
    </div>
  </div>

  <div class="stats">
    <div class="stat total">
      <div class="num">${data.numTotalTests}</div>
      <div class="lbl">Total Tests</div>
    </div>
    <div class="stat passed">
      <div class="num">${data.numPassedTests}</div>
      <div class="lbl">Passed</div>
    </div>
    <div class="stat failed">
      <div class="num">${data.numFailedTests}</div>
      <div class="lbl">Failed</div>
    </div>
    <div class="stat skipped">
      <div class="num">${data.numPendingTests}</div>
      <div class="lbl">Skipped</div>
    </div>
  </div>

  <h2 style="color:#fff;margin-bottom:1rem;">Suite Breakdown</h2>
  <table>
    <thead>
      <tr>
        <th>Suite</th>
        <th>Status</th>
        <th>Tests</th>
        <th>Duration</th>
      </tr>
    </thead>
    <tbody>
      ${data.testResults
        .map((s) => {
          const suiteName = path.basename(s.name);
          const passed = s.assertionResults.filter((t) => t.status === 'passed').length;
          const total = s.assertionResults.length;
          const duration = ((s.endTime - s.startTime) / 1000).toFixed(1);
          const statusClass = s.status === 'passed' ? 'status-pass' : 'status-fail';
          return `<tr>
            <td>${suiteName}</td>
            <td class="${statusClass}">${s.status.toUpperCase()}</td>
            <td>${passed}/${total}</td>
            <td>${duration}s</td>
          </tr>`;
        })
        .join('\n')}
    </tbody>
  </table>

  <h2 style="color:#fff;margin-bottom:1rem;">Individual Test Results</h2>
  ${data.testResults
    .map((s) => {
      const suiteName = path.basename(s.name);
      return `
      <div class="suite-header">${suiteName}</div>
      <table>
        <thead><tr><th>Test</th><th>Status</th><th>Duration</th></tr></thead>
        <tbody>
        ${s.assertionResults
          .map((t) => {
            const statusClass =
              t.status === 'passed' ? 'status-pass' : t.status === 'failed' ? 'status-fail' : 'status-skip';
            const errorHtml =
              t.status === 'failed' && t.failureMessages?.length
                ? `<div class="error-panel">${escapeHtml(t.failureMessages.join('\n'))}</div>`
                : '';
            return `<tr>
              <td>${escapeHtml(t.title)}${errorHtml}</td>
              <td class="${statusClass}">${t.status.toUpperCase()}</td>
              <td>${t.duration}ms</td>
            </tr>`;
          })
          .join('\n')}
        </tbody>
      </table>`;
    })
    .join('\n')}

  ${
    failedTests.length > 0
      ? `
  <h2 style="color:#fca5a5;margin:2rem 0 1rem;">❌ Failed Tests Detail</h2>
  ${failedTests
    .map(
      (t) => `
  <div style="margin-bottom:1rem;">
    <strong style="color:#fca5a5;">${escapeHtml(t.suite)} → ${escapeHtml(t.title)}</strong>
    ${t.error ? `<div class="error-panel">${escapeHtml(t.error)}</div>` : ''}
  </div>`,
    )
    .join('\n')}
  `
      : ''
  }

  <div class="footer">
    E-Kabadi Automated QA Pipeline &middot; Generated by generate-qa-report.ts
  </div>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log(`\n✅ QA Report generated: ${outputPath}`);
  console.log(`   Total: ${data.numTotalTests} | Passed: ${data.numPassedTests} | Failed: ${data.numFailedTests}`);
  console.log(`   Result: ${overallPass ? '🟢 ALL PASSED' : '🔴 FAILURES DETECTED'}\n`);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

generateReport();
