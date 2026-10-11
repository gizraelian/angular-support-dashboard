import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
export default class SafeReporter implements Reporter {
  onStdOut(chunk: string | Buffer) {
    const text = chunk.toString();
    if (text.startsWith('PASS: ') || text.startsWith('M5: ')) console.log(text.trim());
  }
  onTestEnd(test: TestCase, result: TestResult) {
    // Omit network data/attachments; redact fixture credentials in assertion errors.
    console.log(`${result.status.toUpperCase()}: ${test.title}`);
    if (result.status !== 'passed') {
      let message = result.errors[0]?.message || 'No error message';
      for (const key of ['M5_PASSWORD', 'M5_USERNAME', 'LOCAL_DB_PASSWORD', 'LOCAL_APP_PASSWORD']) {
        const secret = process.env[key];
        if (secret) message = message.replaceAll(secret, '[redacted]');
      }
      console.log(message.slice(0, 1800));
    }
  }
  onEnd(result: FullResult) {
    console.log(`M5 browser suite: ${result.status}`);
  }
  onError() {
    console.log('M5 setup/runner error (details withheld to protect authentication data).');
  }
}
