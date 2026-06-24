import 'package:flutter_test/flutter_test.dart';
import 'package:weret_mobile/core/utils/upload_url.dart';

void main() {
  group('upload url', () {
    test('resolve keeps absolute urls', () {
      expect(UploadUrl.resolve('https://cdn.example/x.png'), 'https://cdn.example/x.png');
    });

    test('resolve prefixes relative paths', () {
      expect(UploadUrl.resolve('/uploads/public/u1/a.png'), contains('/uploads/public/u1/a.png'));
    });

    test('resolve empty returns empty', () {
      expect(UploadUrl.resolve(null), '');
      expect(UploadUrl.resolve(''), '');
    });
  });

  group('auth validation patterns', () {
    test('email regex', () {
      final emailRe = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
      expect(emailRe.hasMatch('a@b.com'), isTrue);
      expect(emailRe.hasMatch('bad'), isFalse);
    });

    test('national id length', () {
      expect(RegExp(r'^[0-9]{10,20}$').hasMatch('1234567890'), isTrue);
      expect(RegExp(r'^[0-9]{10,20}$').hasMatch('123'), isFalse);
    });
  });
}
