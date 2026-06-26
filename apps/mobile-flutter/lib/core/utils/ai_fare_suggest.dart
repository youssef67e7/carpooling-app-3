class AiFareSuggest {
  const AiFareSuggest._();

  static double surgeMultiplier(DateTime now) {
    final h = now.hour;
    if (h >= 6 && h < 9) return 1.3;
    if (h >= 17 && h < 20) return 1.4;
    if (h >= 22 || h < 5) return 1.5;
    return 1.0;
  }

  static double suggestFare({
    required double baseFare,
    required double distanceKm,
    required double pricePerKm,
    DateTime? time,
  }) {
    final mult = surgeMultiplier(time ?? DateTime.now());
    final raw = baseFare + (distanceKm * pricePerKm);
    return (raw * mult * 100).roundToDouble() / 100;
  }
}
