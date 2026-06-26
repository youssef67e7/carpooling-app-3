import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

class AvatarEditor extends StatelessWidget {
  final String? imageUrl;
  final double size;
  final VoidCallback? onEdit;

  const AvatarEditor({
    super.key,
    this.imageUrl,
    this.size = 80,
    this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        children: [
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: WeretTokens.inputFill,
              border: Border.all(color: WeretTokens.borderSubtle, width: 2),
              image: imageUrl != null
                  ? DecorationImage(image: AssetImage(imageUrl!), fit: BoxFit.cover)
                  : null,
            ),
            child: imageUrl == null
                ? Icon(Icons.person_outline, size: size * 0.45, color: WeretTokens.textMuted)
                : null,
          ),
          if (onEdit != null)
            Positioned(
              bottom: 0,
              right: 0,
              child: GestureDetector(
                onTap: onEdit,
                child: Container(
                  width: size * 0.3,
                  height: size * 0.3,
                  decoration: const BoxDecoration(
                    color: WeretTokens.brand,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.camera_alt, color: Colors.white, size: size * 0.15),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
