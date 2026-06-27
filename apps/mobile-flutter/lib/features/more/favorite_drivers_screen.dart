import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/show_alert.dart';

class FavoriteDriversScreen extends ConsumerStatefulWidget {
  const FavoriteDriversScreen({super.key});
  @override
  ConsumerState<FavoriteDriversScreen> createState() => _FavoriteDriversScreenState();
}

class _FavoriteDriversScreenState extends ConsumerState<FavoriteDriversScreen> {
  List<Map<String, dynamic>> _favorites = [];
  bool _loading = true;
  String? _error;
  int _page = 1;
  int _totalPages = 1;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      final data = await api.getJson(ApiEndpoints.favoritesDrivers, query: {'page': '$_page', 'limit': '20'});
      setState(() {
        _favorites = (data['drivers'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
        _totalPages = data['pages'] as int? ?? 1;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      setState(() { _error = '$e'; _loading = false; });
    }
  }

  Future<void> _remove(String driverId) async {
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.delete(ApiEndpoints.favoriteDriverRemove(driverId));
      setState(() => _favorites.removeWhere((f) => f['driver'] is Map && (f['driver'] as Map)['_id'] == driverId));
      if (mounted) showAlert(context, 'success', 'Removed from favorites');
    } catch (e) {
      if (mounted) showAlert(context, 'error', '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        title: const Text('Favorite Drivers', style: TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text('$_error', style: const TextStyle(color: Colors.red)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _favorites.isEmpty
                      ? ListView(children: [
                          Padding(
                            padding: const EdgeInsets.all(32),
                            child: Text('No favorite drivers yet', textAlign: TextAlign.center, style: TextStyle(color: WeretTokens.textMuted)),
                          ),
                        ])
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _favorites.length + 1,
                          itemBuilder: (_, i) {
                            if (i == _favorites.length) {
                              if (_totalPages <= 1) return const SizedBox.shrink();
                              return Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  if (_page > 1) TextButton(onPressed: () { setState(() => _page--); _load(); }, child: const Text('‹ Previous')),
                                  const SizedBox(width: 16),
                                  Text('$_page / $_totalPages'),
                                  const SizedBox(width: 16),
                                  if (_page < _totalPages) TextButton(onPressed: () { setState(() => _page++); _load(); }, child: const Text('Next ›')),
                                ],
                              );
                            }
                            final fav = _favorites[i];
                            final driver = fav['driver'] as Map<String, dynamic>? ?? {};
                            final name = driver['name'] as String? ?? '—';
                            final photo = driver['profileImageUrl'] as String? ?? '';
                            final rating = (driver['rating'] as num?)?.toDouble() ?? 0;
                            final carModel = driver['carModel'] as String? ?? '';
                            final plateNumber = driver['plateNumber'] as String? ?? '';
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: WeretTokens.inputFill,
                                  backgroundImage: photo.isNotEmpty ? NetworkImage(photo) : null,
                                  child: photo.isEmpty ? const Icon(Icons.person, color: WeretTokens.textSecondary) : null,
                                ),
                                title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                                subtitle: Text([if (carModel.isNotEmpty) carModel, if (plateNumber.isNotEmpty) plateNumber].join(' · '), maxLines: 1),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    if (rating > 0)
                                      Padding(
                                        padding: const EdgeInsets.only(right: 8),
                                        child: Chip(
                                          avatar: const Icon(Icons.star, size: 16, color: Colors.amber),
                                          label: Text(rating.toStringAsFixed(1), style: const TextStyle(fontSize: 12)),
                                          visualDensity: VisualDensity.compact,
                                        ),
                                      ),
                                    IconButton(
                                      icon: const Icon(Icons.favorite, color: Colors.red),
                                      onPressed: () => _remove(driver['_id'] as String? ?? ''),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}
