import { runMechanicalCheck } from './index.js';

const args = process.argv.slice(2);
const input = { payloadKg: 0.1 };
try {
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (!['--payload', '--target'].includes(option) || value === undefined || value.trim() === '') {
      throw new Error('Usage: npm run lab -- --payload 0.1 --target -0.5');
    }
    input[option === '--payload' ? 'payloadKg' : 'targetAngle'] = Number(value);
  }
  console.log(JSON.stringify(await runMechanicalCheck(input), null, 2));
} catch (error) {
  console.error(JSON.stringify({ error: error.code || 'LAB_INVALID_ARGUMENT', message: error.message }));
  process.exitCode = 1;
}
