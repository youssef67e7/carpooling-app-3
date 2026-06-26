import 'package:google_sign_in/google_sign_in.dart';

class NativeGoogleSignIn {
  const NativeGoogleSignIn._();

  static final GoogleSignIn _instance = GoogleSignIn(
    scopes: ['email', 'profile'],
  );

  static GoogleSignIn get instance => _instance;

  static Future<GoogleSignInAccount?> signIn() => _instance.signIn();

  static Future<GoogleSignInAccount?> signInSilently() =>
      _instance.signInSilently();

  static Future<void> signOut() => _instance.signOut();

  static Future<bool> isSignedIn() => _instance.isSignedIn();

  static Stream<GoogleSignInAccount?> get onCurrentUserChanged =>
      _instance.onCurrentUserChanged;
}
