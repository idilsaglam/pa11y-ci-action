const core = require('@actions/core');
const { execSync } = require('child_process');
const fs = require('fs');

async function run() {
  try {
    // 1. Read inputs
    const urlsInput = core.getInput('urls', { required: true });
    const output = core.getInput('output') || 'pa11y-report.json';

    // 2. Parse URLs into an array
    const urls = urlsInput
      .split('\n')
      .map(u => u.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      throw new Error('No URLs provided in "urls" input.');
    }

    // 3. Build pa11y-ci config object
    const config = {
      urls,
      defaults: {
        standard: 'WCAG2AA',
        wait: 1000,
        timeout: 30000,
        chromeLaunchConfig: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ],
        },
      },
    };

    // 4. Write config file
    fs.writeFileSync('.pa11yci.generated.json', JSON.stringify(config, null, 2));
    core.info('Generated .pa11yci.generated.json');
    core.info(JSON.stringify(config, null, 2));

    // 5. Install Chrome for Puppeteer
    core.startGroup('Install Chrome for puppeteer');
    execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
    core.endGroup();

    // 6. Run pa11y-ci with the generated config
    core.startGroup('Run pa11y-ci');
    const cmd = `npx pa11y-ci@4.0.1 --config .pa11yci.generated.json --json --reporter json > ${output}`;
    execSync(cmd, { stdio: 'inherit', shell: '/bin/bash' });
    core.endGroup();

    // 7. Set output so workflows can read it
    core.setOutput('report-path', output);
    core.info(`Report written to ${output}`);
  } catch (error) {
    core.setFailed(error.message || String(error));
  }
}

run();
