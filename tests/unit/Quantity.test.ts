import { describe, it, expect } from 'vitest';
import { Unit, UnitConverter } from '../../src/domain/value-objects/Unit.js';
import { Quantity } from '../../src/domain/value-objects/Quantity.js';

describe('Unit and Quantity Conversions', () => {
  it('should accurately convert weight between kg and g', () => {
    const qtyKg = new Quantity(1.2, Unit.KG);
    const inGrams = qtyKg.convertTo(Unit.GRAM);
    expect(inGrams.getAmount()).toBe(1200);
    expect(inGrams.getUnit()).toBe(Unit.GRAM);

    const backToKg = inGrams.convertTo(Unit.KG);
    expect(backToKg.getAmount()).toBe(1.2);
  });

  it('should accurately convert volume between litre and ml', () => {
    const qtyLitre = new Quantity(10.5, Unit.LITRE);
    const inMl = qtyLitre.convertTo(Unit.ML);
    expect(inMl.getAmount()).toBe(10500);

    const backToLitre = inMl.convertTo(Unit.LITRE);
    expect(backToLitre.getAmount()).toBe(10.5);
  });

  it('should convert packaging units between cartons and packets (20 packets per carton)', () => {
    const cartons = new Quantity(9, Unit.CARTON);
    const packets = cartons.convertTo(Unit.PACKET, 20);
    expect(packets.getAmount()).toBe(180);

    const halfCartonPackets = new Quantity(10, Unit.PACKET);
    const inCartons = halfCartonPackets.convertTo(Unit.CARTON, 20);
    expect(inCartons.getAmount()).toBe(0.5);
  });
});
