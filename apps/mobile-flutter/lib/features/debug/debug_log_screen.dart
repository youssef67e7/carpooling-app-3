import 'dart:io';
import 'package:flutter/material.dart';
import '../../core/services/debug_logger.dart';

class DebugLogScreen extends StatefulWidget {
  const DebugLogScreen({super.key});
  @override
  State<DebugLogScreen> createState() => _DebugLogScreenState();
}

class _DebugLogScreenState extends State<DebugLogScreen> {
  String _logContent = '';
  String _logPath = '';
  bool _loading = true;
  int _lineCount = 0;
  int _errorCount = 0;

  @override
  void initState() {
    super.initState();
    _loadLog();
  }

  Future<void> _loadLog() async {
    setState(() => _loading = true);
    try {
      _logPath = await DebugLogger.instance.logFilePath;
      _logContent = await DebugLogger.instance.readLog();
      _lineCount = '\n'.allMatches(_logContent).length;
      _errorCount = '❌'.allMatches(_logContent).length;
    } catch (e) {
      _logContent = 'Error loading log: $e';
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _shareLog() async {
    final file = File(_logPath);
    if (!await file.exists()) return;
    // On Android we can use share_plus package - for now copy to downloads
    final dir = Directory('/storage/emulated/0/Download');
    if (await dir.exists()) {
      final dest = File('${dir.path}/weret_debug_log.txt');
      await file.copy(dest.path);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Log saved to Downloads/weret_debug_log.txt')),
        );
      }
    } else {
      // Fallback: show share dialog with path
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Log file path: $_logPath')),
        );
      }
    }
  }

  Future<void> _clearLog() async {
    final logger = DebugLogger.instance;
    try {
      final file = File(_logPath);
      if (await file.exists()) await file.writeAsString('');
      logger.info('DEBUG', 'Log file cleared by user');
    } catch (_) {}
    await _loadLog();
  }

  Color _bgForLine(String line) {
    if (line.contains('❌')) return Colors.red.withValues(alpha: 0.12);
    if (line.contains('⚠️')) return Colors.orange.withValues(alpha: 0.08);
    if (line.contains('🌐') && line.contains('ERROR')) return Colors.red.withValues(alpha: 0.06);
    if (line.contains('📱')) return Colors.blue.withValues(alpha: 0.04);
    if (line.contains('🖱️')) return Colors.green.withValues(alpha: 0.04);
    return Colors.transparent;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Debug Log'),
        actions: [
          Text('$_lineCount lines · $_errorCount errors', style: const TextStyle(fontSize: 11)),
          const SizedBox(width: 4),
          IconButton(icon: const Icon(Icons.refresh, size: 20), onPressed: _loadLog, tooltip: 'Refresh'),
          IconButton(icon: const Icon(Icons.share, size: 20), onPressed: _shareLog, tooltip: 'Export log'),
          IconButton(icon: const Icon(Icons.delete_outline, size: 20), onPressed: _clearLog, tooltip: 'Clear log'),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _logContent.isEmpty
              ? const Center(child: Text('No log entries yet. Interact with the app to generate logs.'))
              : ListView.builder(
                  itemCount: _lineCount,
                  itemBuilder: (context, index) {
                    final lines = _logContent.split('\n');
                    if (index >= lines.length) return const SizedBox();
                    final line = lines[index];
                    if (line.trim().isEmpty) return const SizedBox(height: 4);
                    return Container(
                      color: _bgForLine(line),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
                      child: Text(
                        line,
                        style: TextStyle(
                          fontSize: 9,
                          fontFamily: 'monospace',
                          color: line.contains('❌') ? Colors.red.shade800 : Colors.black87,
                          height: 1.35,
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
