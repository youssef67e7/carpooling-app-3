/// Helpers for passenger data embedded in MongoDB ride documents.

String passengerNameFromRide(Map<String, dynamic> ride) {
  final p = ride['passengerId'];
  if (p is Map) return '${p['name'] ?? p['email'] ?? '—'}';
  return '—';
}

String passengerStatsLabel(Map<String, dynamic> ride) {
  final stats = ride['passengerStats'];
  if (stats is Map) {
    final count = stats['completedRides'] ?? stats['completed_rides'] ?? 0;
    final rating = stats['averageRating'] ?? stats['average_rating'];
    if (rating != null) return '$rating ($count rides)';
    if (count != null && count != 0) return '($count rides)';
  }
  return '';
}

String? passengerImageFromRide(Map<String, dynamic> ride) {
  final p = ride['passengerId'];
  if (p is Map) {
    final url = p['profileImageUrl'] ?? p['profile_image_url'];
    if (url != null && '$url'.isNotEmpty) return '$url';
  }
  return null;
}
