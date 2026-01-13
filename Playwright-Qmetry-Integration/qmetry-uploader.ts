import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';

const QMETRY_API_URL =
  'https://qtmcloud.qmetry.com/rest/api/automation/importresult';
const API_TOKEN = 'test';

interface QMetryResponse {
  url: string;
}

export async function uploadToQMetry(junitFilePath: string): Promise<void> {
  console.log('🚀 QMetry for Jira upload started...');
  const junitXML = fs.readFileSync(junitFilePath, 'utf-8');
  const xmlDeclarationRegex = /<\?xml[^>]*\?>\s*/;
  let xmlContentForParsing = junitXML.replace(xmlDeclarationRegex, '');
  let finalJunitXML = junitXML;

  const parser = new XMLParser();
  const parsed = parser.parse(xmlContentForParsing);
  const rootTag = Object.keys(parsed)[0];

  if (rootTag !== 'testsuite' && rootTag !== 'testsuites') {
    finalJunitXML = junitXML.replace(xmlDeclarationRegex, '');
    finalJunitXML = `<testsuite>${finalJunitXML}</testsuite>`;
  }

  const junitBase64 = Buffer.from(finalJunitXML).toString('base64');

  const payload = {
    format: 'junit',
    testResults: junitBase64,
    autoCreateTestCases: true,
    testCycleName: `Playwright Automation Run ${new Date().toISOString()}`,
    buildName: `Build-${Date.now()}`,
  };

  try {
    const response = await axios.post<QMetryResponse>(QMETRY_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        apiKey: API_TOKEN,
      },
    });

    const uploadUrl = response.data.url;
    if (!uploadUrl) {
      console.error('No upload URL returned!');
      return;
    }

    await axios.put(uploadUrl, finalJunitXML, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('JUnit XML uploaded to S3 successfully!');
    console.log('QMetry will now process the file and create the test cycle.');
  } catch (error: any) {
    if (error.response) {
      console.error(
        'QMetry upload failed (Server Response):',
        error.response.status,
        error.response.data
      );
    } else if (error.request) {
      console.error('QMetry upload failed (No Response):', error.request);
    } else {
      console.error(
        'QMetry upload failed (Error during setup):',
        error.message
      );
    }
  }
}

// Example usage (if this file were executable directly)
// uploadToQMetry('./playwright-reports/junit/results.xml').catch(console.error);
