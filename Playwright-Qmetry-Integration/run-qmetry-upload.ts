import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { uploadToQMetry } from './qmetry-uploader';
import { patchJUnitXml } from './qmetry-xml-patcher';

async function runAutomationAndUpload() {
  const junitReportDir = './playwright-reports/junit';
  const junitReportFile = 'results.xml';
  console.log('Running Playwright tests...');
  try {
    execSync('npx playwright test', { stdio: 'inherit' });
    console.log('Playwright tests completed.');
  } catch (error) {
    console.error('Playwright tests failed:', error);
    process.exit(1);
  }

  const fullJunitPath = path.join(junitReportDir, junitReportFile);

  if (!fs.existsSync(fullJunitPath)) {
    console.error(`JUnit report not found at ${fullJunitPath}`);
    process.exit(1);
  }

  await patchJUnitXml(fullJunitPath);
  await uploadToQMetry(fullJunitPath);
}

runAutomationAndUpload().catch(error => {
  console.error(
    'An error occurred during the automation and upload process:',
    error
  );
  process.exit(1);
});
