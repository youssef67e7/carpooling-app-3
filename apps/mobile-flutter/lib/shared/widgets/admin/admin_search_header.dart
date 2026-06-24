import 'dart:async';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../../core/providers/admin_provider.dart';
import '../../../core/theme/weret_tokens.dart';

class AdminSearchHeader extends StatefulWidget {
  const AdminSearchHeader({
    super.key,
    required this.initialSearch,
    required this.onSearch,
    required this.onRefresh,
    this.loading = false,
  });

  final String initialSearch;
  final ValueChanged<String> onSearch;
  final VoidCallback onRefresh;
  final bool loading;

  @override
  State<AdminSearchHeader> createState() => _AdminSearchHeaderState();
}

class _AdminSearchHeaderState extends State<AdminSearchHeader> {
  late final TextEditingController _controller;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialSearch);
  }

  @override
  void didUpdateWidget(covariant AdminSearchHeader oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialSearch != widget.initialSearch && _controller.text != widget.initialSearch) {
      _controller.text = widget.initialSearch;
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () => widget.onSearch(value.trim()));
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _controller,
              onChanged: _onChanged,
              decoration: InputDecoration(
                hintText: 'adminSearchHint'.tr(),
                prefixIcon: const Icon(Icons.search, size: 20),
                filled: true,
                fillColor: WeretTokens.surface,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(color: WeretTokens.border.withValues(alpha: 0.7)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(color: WeretTokens.border.withValues(alpha: 0.7)),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          IconButton.filled(
            onPressed: widget.loading ? null : widget.onRefresh,
            icon: widget.loading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.refresh_rounded),
            style: IconButton.styleFrom(backgroundColor: WeretTokens.brand, foregroundColor: Colors.white),
          ),
        ],
      ),
    );
  }
}

class AdminPaginationBar extends StatelessWidget {
  const AdminPaginationBar({
    super.key,
    required this.pagination,
    required this.onPrev,
    required this.onNext,
  });

  final AdminPagination pagination;
  final VoidCallback onPrev;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    if (pagination.total == 0) return const SizedBox.shrink();
    final start = ((pagination.page - 1) * pagination.limit) + 1;
    final end = (pagination.page * pagination.limit).clamp(0, pagination.total);
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: WeretTokens.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: WeretTokens.border.withValues(alpha: 0.6)),
      ),
      child: Row(
        children: [
          IconButton(onPressed: pagination.hasPrev ? onPrev : null, icon: const Icon(Icons.chevron_left)),
          Expanded(
            child: Text(
              'adminPageRange'.tr(namedArgs: {'start': '$start', 'end': '$end', 'total': '${pagination.total}'}),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: WeretTokens.textSecondary),
            ),
          ),
          IconButton(onPressed: pagination.hasNext ? onNext : null, icon: const Icon(Icons.chevron_right)),
        ],
      ),
    );
  }
}
