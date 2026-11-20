export enum Unit {
  KG = 'kg',
  GRAM = 'g',
  LITRE = 'litre',
  ML = 'ml',
  PIECE = 'piece',
  PACKET = 'packet',
  CARTON = 'carton',
}

export class UnitConverter {
  /**
   * Converts a quantity from sourceUnit to targetUnit.
   * Supports:
   *  kg <-> g (1 kg = 1000 g)
   *  litre <-> ml (1 L = 1000 ml)
   *  carton <-> packet (1 carton = packSize packets, default 20)
   */
  public static convert(
    amount: number,
    fromUnit: Unit,
    toUnit: Unit,
    packetsPerCarton: number = 20
  ): number {
    if (fromUnit === toUnit) {
      return amount;
    }

    // Weight conversions
    if (fromUnit === Unit.KG && toUnit === Unit.GRAM) {
      return amount * 1000;
    }
    if (fromUnit === Unit.GRAM && toUnit === Unit.KG) {
      return amount / 1000;
    }

    // Volume conversions
    if (fromUnit === Unit.LITRE && toUnit === Unit.ML) {
      return amount * 1000;
    }
    if (fromUnit === Unit.ML && toUnit === Unit.LITRE) {
      return amount / 1000;
    }

    // Packaging / Container conversions
    if (fromUnit === Unit.CARTON && toUnit === Unit.PACKET) {
      return amount * packetsPerCarton;
    }
    if (fromUnit === Unit.PACKET && toUnit === Unit.CARTON) {
      return amount / packetsPerCarton;
    }

    if (
      (fromUnit === Unit.PIECE && toUnit === Unit.PACKET) ||
      (fromUnit === Unit.PACKET && toUnit === Unit.PIECE)
    ) {
      return amount;
    }

    throw new Error(`Incompatible unit conversion from ${fromUnit} to ${toUnit}`);
  }
}
