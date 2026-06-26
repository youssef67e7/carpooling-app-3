import 'dart:io';
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

enum LogLevel { info, warning, error, navigation, action, network }

class DebugLogger {
  DebugLogger._();

  static final DebugLogger _instance = DebugLogger._();
  static DebugLogger get instance => _instance;

  File? _file;
  IOSink? _sink;
  String? _currentScreen;
  bool _initialized = false;
  Timer? _flushTimer;
  final _buffer = StringBuffer();

  Future<void> init() async {
    if (_initialized) return;
    final dir = await getApplicationDocumentsDirectory();
    final timestamp = DateTime.now().toIso8601String().replaceAll(':', '-').split('.').first;
    _file = File('${dir.path}/debug_log_$timestamp.txt');
    _sink = _file!.openWrite(mode: FileMode.append);
    _initialized = true;

    _flushTimer = Timer.periodic(const Duration(seconds: 5), (_) => flush());

    _write('APP', 'START', 'Debug logger initialized');
    info('Device', 'Platform: ${defaultTargetPlatform.name}');
  }

  void setCurrentScreen(String screen) {
    _currentScreen = screen;
    _write('NAV', 'SCREEN', screen);
  }

  String? get currentScreen => _currentScreen;

  void log(LogLevel level, String category, String message, {dynamic error, StackTrace? stack}) {
    if (!_initialized) return;
    final icon = switch (level) {
      LogLevel.error => '❌',
      LogLevel.warning => '⚠️',
      LogLevel.navigation => '📱',
      LogLevel.action => '🖱️',
      LogLevel.network => '🌐',
      LogLevel.info => 'ℹ️',
    };
    final levelStr = level.name.toUpperCase();
    final screen = _currentScreen ?? '?';
    _write(levelStr, category, message, icon: icon, screen: screen);
    if (error != null) {
      _write(levelStr, '$category-ERROR', error.toString(), icon: '💥', screen: screen);
    }
    if (stack != null) {
      _write(levelStr, '$category-STACK', stack.toString().split('\n').take(6).join('\n'), icon: '📋', screen: screen);
    }
  }

  void info(String category, String message) => log(LogLevel.info, category, message);
  void warning(String category, String message) => log(LogLevel.warning, category, message);
  void error(String category, String message, {dynamic error, StackTrace? stack}) =>
      log(LogLevel.error, category, message, error: error, stack: stack);
  void navigation(String from, String to) => log(LogLevel.navigation, 'NAV', '$from → $to');
  void action(String label, {String? screen}) {
    log(LogLevel.action, 'TAP', label);
  }
  void network(String method, String url, {int? statusCode, dynamic error, int? durationMs}) {
    final durationStr = durationMs != null ? ' (${durationMs}ms)' : '';
    final msg = error != null 
        ? '$method $url → ERROR: $error$durationStr'
        : '$method $url → $statusCode$durationStr';
    log(LogLevel.network, 'HTTP', msg);
  }

  void flush() {
    if (_buffer.isNotEmpty && _sink != null) {
      _sink!.write(_buffer.toString());
      _sink!.flush();
      _buffer.clear();
    }
  }

  void _write(String level, String category, String message, {String icon = '', String screen = ''}) {
    final now = DateTime.now();
    final ts = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}.${now.millisecond.toString().padLeft(3, '0')}';
    final line = '$icon [$ts] [$level] [$screen] [$category] $message\n';
    debugPrint(line.trim());
    _buffer.write(line);
    if (_buffer.length > 4096) flush();
  }

  Future<String> get logFilePath async {
    if (_file == null) return 'not initialized';
    return _file!.path;
  }

  Future<String> readLog() async {
    if (_file == null) return 'not initialized';
    return await _file!.readAsString();
  }

  void dispose() {
    _flushTimer?.cancel();
    flush();
    _sink?.close();
    _initialized = false;
  }
}
