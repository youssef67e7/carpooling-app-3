class AiPlaceRerank {
  const AiPlaceRerank._();

  static List<T> rerankByDistance<T>(
    List<T> items,
    double Function(T item) distanceFn,
  ) {
    final sorted = List<T>.from(items);
    sorted.sort((a, b) => distanceFn(a).compareTo(distanceFn(b)));
    return sorted;
  }
}
