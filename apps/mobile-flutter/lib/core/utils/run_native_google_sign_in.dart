import 'package:google_sign_in/google_sign_in.dart';

class RunNativeGoogleSignIn {
  const RunNativeGoogleSignIn._();

  static Future<GoogleSignInAccount?> run() async {
    try {
      final google = GoogleSignIn(scopes: ['email', 'profile']);
      final account = await google.signIn();
      return account;
    } catch (_) {
      return null;
    }
  }

  static Future<String?> getIdToken() async {
    try {
      final google = GoogleSignIn(scopes: ['email', 'profile']);
      final account = await google.signIn();
      if (account == null) return null;
      final auth = await account.authentication;
      return auth.idToken;
    } catch (_) {
      return null;
    }
  }
}
