import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import '../services/debug_logger.dart';

class UploadService {
  UploadService(this._ref);

  final Ref _ref;
  final _picker = ImagePicker();
  static const _cloudinaryCloudName = 'dixvj7zzs';
  static const _cloudinaryUploadPreset = 'weret_unsigned';

  Future<XFile?> pickImage({ImageSource source = ImageSource.gallery}) {
    return _picker.pickImage(source: source, maxWidth: 1200, maxHeight: 1200, imageQuality: 70);
  }

  Future<String> uploadImage(XFile file, {String visibility = 'private'}) async {
    final logger = DebugLogger.instance;
    
    try {
      return await _uploadDirectToCloudinary(file, visibility: visibility);
    } catch (directError) {
      logger.error('UPLOAD', 'Direct Cloudinary upload failed, falling back to backend', error: directError);
      return await _uploadViaBackend(file, visibility: visibility);
    }
  }

  Future<String> _uploadDirectToCloudinary(XFile file, {required String visibility}) async {
    final bytes = await file.readAsBytes();
    final ext = file.name.split('.').last.toLowerCase();
    final mime = ext == 'png' ? 'image/png' : ext == 'webp' ? 'image/webp' : 'image/jpeg';
    final base64 = base64Encode(bytes);
    final dataUrl = 'data:$mime;base64,$base64';

    final uri = Uri.parse('https://api.cloudinary.com/v1_1/$_cloudinaryCloudName/image/upload');
    final response = await http.post(
      uri,
      body: {
        'file': dataUrl,
        'upload_preset': _cloudinaryUploadPreset,
        'folder': visibility == 'public' ? 'public_uploads' : 'driver_uploads',
      },
    ).timeout(const Duration(seconds: 30));

    if (response.statusCode != 200) {
      throw Exception('Cloudinary upload failed: ${response.statusCode} ${response.body}');
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final url = '${data['secure_url'] ?? ''}'.trim();
    if (url.isEmpty) throw Exception('Cloudinary upload returned empty URL');
    return url;
  }

  Future<String> _uploadViaBackend(XFile file, {required String visibility}) async {
    final api = await _ref.read(apiClientProvider.future);
    final bytes = await file.readAsBytes();
    final ext = file.name.split('.').last.toLowerCase();
    final mime = ext == 'png' ? 'image/png' : ext == 'webp' ? 'image/webp' : 'image/jpeg';
    final base64 = base64Encode(bytes);
    final dataUrl = 'data:$mime;base64,$base64';
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
