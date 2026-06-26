import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';

class UploadService {
  UploadService(this._ref);

  final Ref _ref;
  final _picker = ImagePicker();

  Future<XFile?> pickImage({ImageSource source = ImageSource.gallery}) {
    return _picker.pickImage(source: source, maxWidth: 1200, maxHeight: 1200, imageQuality: 70);
  }

  Future<String> uploadImage(XFile file, {String visibility = 'private'}) async {
    final api = await _ref.read(apiClientProvider.future);
    final bytes = await file.readAsBytes();
    final ext = file.name.split('.').last.toLowerCase();
    final mime = ext == 'png' ? 'image/png' : ext == 'webp' ? 'image/webp' : 'image/jpeg';
    final dataUrl = 'data:$mime;base64,${base64Encode(bytes)}';
    final res = await api.postJson(ApiEndpoints.upload, {
      'image': dataUrl,
      'folder': visibility == 'public' ? 'public_uploads' : 'driver_uploads',
    });
    final url = '${res['data']?['url'] ?? ''}'.trim();
    if (url.isEmpty) throw Exception('Upload failed');
    return url;
  }
}

final uploadServiceProvider = Provider<UploadService>((ref) => UploadService(ref));
