import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

class MapProvider {
  const MapProvider._();

  static const tileUrlTemplate = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  static const Map<String, String> tileHeaders = {
    'User-Agent': 'WERET/1.0',
  };

  static const maxZoom = 19.0;
  static const minZoom = 3.0;

  static CachedTileProvider? _provider;
  static CachedTileProvider get tileProvider {
    _provider ??= CachedTileProvider(headers: Map<String, String>.from(tileHeaders));
    return _provider!;
  }
}

/// A [TileProvider] that caches tiles to disk for offline use.
///
/// Tiles are stored under `<app-dir>/map_tiles/` and served from cache
/// for up to [maxAge]. A background download populates the cache on first
/// access so subsequent views load from disk.
class CachedTileProvider extends TileProvider {
  CachedTileProvider({super.headers, this.maxAge = const Duration(days: 30)});

  final Duration maxAge;
  Directory? _cacheDir;
  http.Client? _client;

  Future<Directory> get _dir async {
    if (_cacheDir != null) return _cacheDir!;
    final appDir = await getTemporaryDirectory();
    _cacheDir = Directory('${appDir.path}${Platform.pathSeparator}map_tiles');
    if (!_cacheDir!.existsSync()) _cacheDir!.createSync(recursive: true);
    return _cacheDir!;
  }

  String _tilePath(String url) {
    final encoded = base64Url.encode(utf8.encode(url));
    return '${Platform.pathSeparator}$encoded.png';
  }

  bool _isFresh(File file) => DateTime.now().difference(file.lastModifiedSync()) < maxAge;

  @override
  ImageProvider getImage(TileCoordinates coordinates, TileLayer options) {
    final url = getTileUrl(coordinates, options);

    if (kIsWeb) {
      return NetworkImage(url);
    }

    try {
      final dir = _cacheDir;
      final file = dir != null ? File('${dir.path}${_tilePath(url)}') : null;

      if (file != null && file.existsSync() && _isFresh(file)) {
        return FileImage(file);
      }

      _cacheAsync(url, file);
    } catch (_) {}

    return NetworkImage(url);
  }

  void _cacheAsync(String url, File? file) {
    unawaited(_doCache(url, file));
  }

  Future<void> _doCache(String url, File? file) async {
    try {
      final dir = await _dir;
      final f = file ?? File('${dir.path}${_tilePath(url)}');
      if (f.existsSync() && _isFresh(f)) return;

      _client ??= http.Client();
      final res = await _client!.get(Uri.parse(url), headers: headers.isNotEmpty ? headers : null);
      if (res.statusCode == 200) {
        if (!f.parent.existsSync()) f.parent.createSync(recursive: true);
        await f.writeAsBytes(res.bodyBytes);
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _client?.close();
    _client = null;
    _cacheDir = null;
    super.dispose();
  }
}
