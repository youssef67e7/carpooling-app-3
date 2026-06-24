import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/upload_service.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/upload_url.dart';

class DocumentUploadField extends ConsumerStatefulWidget {
  const DocumentUploadField({
    super.key,
    required this.label,
    required this.url,
    required this.onChanged,
    this.visibility = 'private',
    this.optional = false,
  });

  final String label;
  final String? url;
  final ValueChanged<String?> onChanged;
  final String visibility;
  final bool optional;

  @override
  ConsumerState<DocumentUploadField> createState() => _DocumentUploadFieldState();
}

class _DocumentUploadFieldState extends ConsumerState<DocumentUploadField> {
  bool _uploading = false;

  Future<void> _pick() async {
    setState(() => _uploading = true);
    try {
      final upload = ref.read(uploadServiceProvider);
      final file = await upload.pickImage();
      if (file == null) return;
      final url = await upload.uploadImage(file, visibility: widget.visibility);
      widget.onChanged(url);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('authUploadFailed'.tr(namedArgs: {'error': e.toString()}))),
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasUrl = widget.url != null && widget.url!.isNotEmpty;
    final resolved = hasUrl ? UploadUrl.resolve(widget.url) : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                widget.label + (widget.optional ? ' (${'driverOnboardingOptional'.tr()})' : ''),
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
              ),
            ),
            if (hasUrl)
              IconButton(
                icon: const Icon(Icons.close, size: 20),
                onPressed: _uploading ? null : () => widget.onChanged(null),
                tooltip: 'authUploadRemove'.tr(),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Material(
          color: WeretTokens.surface,
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: _uploading ? null : _pick,
            child: Container(
              height: 120,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: WeretTokens.border.withValues(alpha: 0.6)),
              ),
              child: _uploading
                  ? const Center(child: CircularProgressIndicator())
                  : hasUrl
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(11),
                          child: Image.network(resolved!, fit: BoxFit.cover, width: double.infinity),
                        )
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.add_a_photo_outlined, color: WeretTokens.brand.withValues(alpha: 0.85)),
                            const SizedBox(height: 6),
                            Text('authUploadTap'.tr(), style: const TextStyle(fontSize: 12, color: WeretTokens.textSecondary)),
                          ],
                        ),
            ),
          ),
        ),
        if (!widget.optional && !hasUrl)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text('authUploadRequired'.tr(), style: TextStyle(fontSize: 11, color: Colors.orange.shade800)),
          ),
        const SizedBox(height: 12),
      ],
    );
  }
}
