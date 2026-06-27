import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/utils/show_alert.dart';

class FavoriteDriverButton extends ConsumerStatefulWidget {
  const FavoriteDriverButton({super.key, required this.driverId});
  final String driverId;

  @override
  ConsumerState<FavoriteDriverButton> createState() => _FavoriteDriverButtonState();
}

class _FavoriteDriverButtonState extends ConsumerState<FavoriteDriverButton> {
  bool? _isFavorite;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    try {
      final api = await ref.read(apiClientProvider.future);
      final data = await api.getJson(ApiEndpoints.favoriteDriverCheck(widget.driverId));
      if (mounted) setState(() { _isFavorite = data['isFavorite'] as bool? ?? false; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _isFavorite = false; _loading = false; });
    }
  }

  Future<void> _toggle() async {
    try {
      final api = await ref.read(apiClientProvider.future);
      if (_isFavorite == true) {
        await api.delete(ApiEndpoints.favoriteDriverRemove(widget.driverId));
        if (mounted) setState(() => _isFavorite = false);
      } else {
        await api.postJson(ApiEndpoints.favoriteDriverAdd(widget.driverId));
        if (mounted) setState(() => _isFavorite = true);
        if (mounted) showAlert(context, 'success', 'Driver added to favorites');
      }
    } catch (e) {
      if (mounted) showAlert(context, 'error', '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2));
    return IconButton(
      icon: Icon(_isFavorite == true ? Icons.favorite : Icons.favorite_border, color: _isFavorite == true ? Colors.red : null),
      onPressed: _toggle,
      tooltip: _isFavorite == true ? 'Remove from favorites' : 'Add to favorites',
    );
  }
}
