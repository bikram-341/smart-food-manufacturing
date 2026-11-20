import { BenchmarkRunnerService } from '../application/services/BenchmarkRunnerService.js';

async function main() {
  console.log('========================================================================');
  console.log('🚀 RUNNING ORDER-TO-AUDIT SYSTEM BENCHMARK SCENARIO (Section 5)');
  console.log('Centre for Digital Infrastructure, NIT Tiruchirappalli');
  console.log('========================================================================\n');

  const runner = new BenchmarkRunnerService();
  const report = await runner.executeBenchmark();

  console.log('📋 STEP-BY-STEP EXECUTION LOG:');
  for (const step of report.stepsExecuted) {
    console.log(`[Step ${step.stepNumber}] ${step.stepDescription}`);
    console.log(`         Details: ${JSON.stringify(step.details)}`);
  }

  console.log('\n========================================================================');
  console.log('🎯 BENCHMARK VERIFICATION RESULTS (Section 5 Checks):');
  console.log('========================================================================');

  let passCount = 0;
  for (const check of report.resultsChecked) {
    const icon = check.passed ? '✅ PASS' : '❌ FAIL';
    if (check.passed) passCount++;
    console.log(`\n${icon} | ${check.checkName}`);
    console.log(`   Expected: ${check.expected}`);
    console.log(`   Actual:   ${check.actual}`);
    if (check.notes) {
      console.log(`   Notes:    ${check.notes}`);
    }
  }

  console.log('\n========================================================================');
  console.log(`OVERALL STATUS: ${report.overallStatus} (${passCount}/${report.resultsChecked.length} checks passed)`);
  console.log(`Valuation Method: ${report.valuationMethodUsed}`);
  console.log('========================================================================\n');

  if (report.overallStatus !== 'PASS') {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error running benchmark:', err);
  process.exit(1);
});
