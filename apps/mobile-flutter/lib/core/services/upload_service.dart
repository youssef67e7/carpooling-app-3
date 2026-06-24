import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';

class UploadService {
  UploadService(this._ref);

  final Ref _ref;
  final _picker = ImagePicker();

  Future<XFile?> pickImage({ImageSource source = ImageSource.gallery}) {
    return _picker.pickImage(source: source, maxWidth: 2048, maxHeight: 2048, imageQuality: 85);
  }

  Future<String> uploadImage(XFile file, {String visibility = 'private'}) async {
    final api = await _ref.read(apiClientProvider.future);
    final formData = FormData.fromMap({
      'visibility': visibility,
      'image': await MultipartFile.fromFile(file.path, filename: file.name),
    });
    final data = await api.postMultipart(ApiEndpoints.upload, formData);
    final url = '${data['url'] ?? ''}'.trim();
    if (url.isEmpty) throw Exception('Upload failed');
    return url;
  }
}

final uploadServiceProvider = Provider<UploadService>((ref) => UploadService(ref));
