import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/notification_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/ui/form_error_callout.dart';
import '../../shared/widgets/ui/section_surface.dart';
import '../../shared/widgets/ui/stagger_entrance.dart';
import '../../shared/widgets/weret_page_scaffold.dart';

const _pad = 16.0;
const _gap = 20.0;
const _rowPad = 14.0;

const _toggles = [
  _TogglePref('tripUpdates', 'notificationsTripUpdates', 'notificationsTripUpdatesBody'),
  _TogglePref('promotions', 'notificationsPromos', 'notificationsPromosBody'),
  _TogglePref('driverApproval', 'notificationsDriverApproval', 'notificationsDriverApprovalBody'),
  _TogglePref('payments', 'notificationsPayments', 'notificationsPaymentsBody'),
  _TogglePref('chat', 'notificationsChat', 'notificationsChatBody'),
  _TogglePref('email', 'notificationsEmail', 'notificationsEmailBody'),
  _TogglePref('sms', 'notificationsSms', 'notificationsSmsBody'),
];

class NotificationSettingsScreen extends ConsumerStatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  ConsumerState<NotificationSettingsScreen> createState() =>
      _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState
    extends ConsumerState<NotificationSettingsScreen> {
  bool _errorDismissed = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(
      () => ref.read(notificationPrefsProvider.notifier).fetch(),
    );
  }

  Future<void> _onRefresh() =>
      ref.read(notificationPrefsProvider.notifier).fetch();

  void _onToggle(String key, bool value) {
    HapticFeedback.selectionClick();
    ref.read(notificationPrefsProvider.notifier).update(key, value);
  }

  String? _displayError(String? providerError) {
    if (_errorDismissed) return null;
    return providerError;
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(notificationPrefsProvider);
    final error = _displayError(state.error);

    return WeretPageScaffold(
      title: 'featureNotifications'.tr(),
      body: state.loading && state.prefs.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _onRefresh,
              color: WeretTokens.brand,
              child: ListView(
                padding: const EdgeInsets.all(_pad),
                children: [
                  if (error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: _gap),
                      child: FormErrorCallout(
                        message: error,
                        onDismiss: () =>
                            setState(() => _errorDismissed = true),
                      ),
                    ),

                  StaggerEntrance(
                    spacing: _gap,
                    children: [
                      _InfoHint(),
                      _ToggleGroup(
                        prefs: state.prefs,
                        onToggle: _onToggle,
                      ),
                    ],
                  ),

                  const SizedBox(height: _pad),
                ],
              ),
            ),
    );
  }
}

class _TogglePref {
  final String key;
  final String titleKey;
  final String bodyKey;
  const _TogglePref(this.key, this.titleKey, this.bodyKey);
}

class _InfoHint extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: WeretTokens.neutralSoft,
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline_rounded,
              color: WeretTokens.onNeutral, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'notificationsLocalHint'.tr(),
              style: const TextStyle(
                color: WeretTokens.onNeutral,
                fontSize: 13,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ToggleGroup extends StatelessWidget {
  final Map<String, dynamic> prefs;
  final void Function(String key, bool value) onToggle;

  const _ToggleGroup({required this.prefs, required this.onToggle});

  @override
  Widget build(BuildContext context) {
    return SectionSurface(
      padding: EdgeInsets.zero,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (int i = 0; i < _toggles.length; i++) ...[
            _ToggleRow(
              title: _toggles[i].titleKey.tr(),
              body: _toggles[i].bodyKey.tr(),
              value: prefs[_toggles[i].key] as bool? ?? false,
              onChanged: (v) => onToggle(_toggles[i].key, v),
            ),
            if (i < _toggles.length - 1)
              Divider(
                height: 1,
                indent: _rowPad,
                color: WeretTokens.border.withValues(alpha: 0.5),
              ),
          ],
        ],
      ),
    );
  }
}

class _ToggleRow extends StatelessWidget {
  final String title;
  final String body;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _ToggleRow({
    required this.title,
    required this.body,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(_rowPad, 14, 8, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: WeretTokens.textPrimary,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  body,
                  style: const TextStyle(
                    fontSize: 13,
                    color: WeretTokens.textMuted,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ),

        Padding(
          padding: const EdgeInsets.only(top: 10, right: 4),
          child: Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: WeretTokens.brand,
            activeTrackColor: WeretTokens.brand.withValues(alpha: 0.35),
            inactiveThumbColor: WeretTokens.textMuted.withValues(alpha: 0.8),
            inactiveTrackColor: WeretTokens.border.withValues(alpha: 0.5),
          ),
        ),
      ],
    );
  }
}
