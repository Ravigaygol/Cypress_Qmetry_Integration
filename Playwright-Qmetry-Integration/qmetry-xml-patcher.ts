import * as fs from 'fs';
import { parseStringPromise } from 'xml2js';
import { create } from 'xmlbuilder2';

export async function patchJUnitXml(junitFilePath: string): Promise<void> {
  console.log(`Patching JUnit XML: ${junitFilePath}`);
  const xml = fs.readFileSync(junitFilePath, 'utf8');
  const result = await parseStringPromise(xml, {
    explicitArray: false,
    mergeAttrs: true,
  });

  let realSuite: any;
  if (result.testsuites && result.testsuites.testsuite) {
    const suites = Array.isArray(result.testsuites.testsuite)
      ? result.testsuites.testsuite
      : [result.testsuites.testsuite];
    realSuite = suites.find(
      (s: { testcase: string | any[] }) =>
        s.testcase &&
        (Array.isArray(s.testcase) ? s.testcase.length > 0 : s.testcase)
    );
  } else if (result.testsuite) {
    realSuite = result.testsuite;
  }

  if (!realSuite) {
    console.error('No real testsuite with testcases found for patching!');
    return;
  }

  const testcases = Array.isArray(realSuite.testcase)
    ? realSuite.testcase
    : [realSuite.testcase];

  testcases.forEach((tc: any) => {
    const qmetryKeyRegex = /(SCDTC-TC-\d+)/;
    const qmetryKeyMatch = tc.name ? tc.name.match(qmetryKeyRegex) : null;
    const qmetryKey = qmetryKeyMatch ? qmetryKeyMatch[1] : null;

    if (!tc.properties) {
      tc.properties = {};
    }
    if (!tc.properties.property) {
      tc.properties.property = [];
    } else if (!Array.isArray(tc.properties.property)) {
      tc.properties.property = [tc.properties.property];
    }

    tc.properties.property.push({ '@name': 'Automatable', '@value': 'Yes' });
    tc.properties.property.push({ '@name': 'Automated', '@value': 'Yes' });
    tc.properties.property.push({
      '@name': 'Functional Area',
      '@value': 'Regression',
    });

    if (qmetryKey) {
      tc.properties.property.push({
        '@name': 'TestCaseKey',
        '@value': qmetryKey,
      });
    } else {
      console.warn(`No QMetry Key found for test "${tc.name}".`);
    }
  });

  const finalStructure = { testsuite: realSuite };
  const doc = create(finalStructure);
  const updatedXml = doc.end({ prettyPrint: false, headless: false });

  fs.writeFileSync(junitFilePath, updatedXml, 'utf8');
  console.log(`Patched JUnit XML for ${testcases.length} testcase(s).`);
}