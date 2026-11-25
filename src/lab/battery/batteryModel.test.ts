import { batteryRow, batteryTable } from './batteryModel';

describe('battery model', () => {
  it('uses less battery than GPS and a send every second, in every scenario', () => {
    for (const scenario of ['concert', 'marathon', 'trip'] as const) {
      expect(batteryRow(scenario, 'live').mAhPerHour).toBeLessThan(
        batteryRow(scenario, 'naive').mAhPerHour,
      );
    }
  });

  it('saves most when friends stand still or nobody is watching', () => {
    const naive = batteryRow('concert', 'naive').mAhPerHour;
    expect(batteryRow('concert', 'live').mAhPerHour).toBeLessThan(naive / 4);
    for (const scenario of ['concert', 'marathon', 'trip'] as const) {
      expect(batteryRow(scenario, 'idle').mAhPerHour).toBeLessThan(naive / 4);
    }
  });

  it('pays for live updates while a moving friend is watched: the radio barely sleeps', () => {
    expect(batteryRow('marathon', 'live').radioAwakeMinPerHour).toBeGreaterThan(40);
  });

  it('prints the table when asked (BATTERY_TABLE=1)', () => {
    const table = batteryTable();
    if (process.env.BATTERY_TABLE) console.log(table);
    expect(table.split('\n')).toHaveLength(2 + 9);
  });
});
