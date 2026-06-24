class ApiErrors {
  static String message(dynamic e) {
    if (e is Map && e['message'] != null) return '${e['message']}';
    return e.toString();
  }
}
