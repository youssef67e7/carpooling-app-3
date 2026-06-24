import '../../shared/models/weret_user.dart';

class AuthNavigation {
  AuthNavigation._();

  static String homeForUser(WeretUser? user) {
    if (user == null) return '/login';
    if (user.role == 'admin') return '/admin/dashboard';
    if (user.effectiveRole == 'driver') return '/driver/home';
    return '/passenger/home';
  }
}
