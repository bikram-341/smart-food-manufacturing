import { describe, it, expect } from 'vitest';
import { BenchmarkRunnerService } from '../../src/application/services/BenchmarkRunnerService.js';

describe('Benchmark Scenario End-to-End Integration Test (Section 5)', () => {
  it('should run all 9 steps and verify that all 11 expected checks pass with 100% precision', async () => {
    const runner = new BenchmarkRunnerService();
    const report = await runner.executeBenchmark();

    expect(report.overallStatus).toBe('PASS');
    expect(report.stepsExecuted.length).toBe(9);
    expect(report.resultsChecked.length).toBe(11);

    for (const check of report.resultsChecked) {
      expect(check.passed).toBe(true);
    }
  }, 20000);
});
