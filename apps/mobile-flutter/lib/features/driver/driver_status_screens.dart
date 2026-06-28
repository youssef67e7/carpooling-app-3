import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/driver_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/custom_button.dart';
import 'driver_shared_widgets.dart';

class DriverApplicationReceivedScreen extends ConsumerStatefulWidget {
  const DriverApplicationReceivedScreen({super.key});

  @override
  ConsumerState<DriverApplicationReceivedScreen> createState() => _DriverApplicationReceivedScreenState();
}

class _DriverApplicationReceivedScreenState extends ConsumerState<DriverApplicationReceivedScreen> {
  Map<String, dynamic>? _application;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final data = await ref.read(authProvider.notifier).fetchDriverApplication();
    if (mounted) setState(() => _application = data);
  }

  String _status(String key) {
    if (_application?['verification'] is Map) {
      final steps = Map<String, dynamic>.from((_application!['verification'] as Map)['steps'] as Map? ?? {});
      final s = steps[key] as String?;
      if (s != null && s != 'none') return s;
    }
    if (_application == null) return 'under_review';
    return 'under_review';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 24),
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(color: WeretTokens.brand, shape: BoxShape.circle),
              child: const Icon(Icons.check, color: WeretTokens.surface, size: 36),
            ),
            const SizedBox(height: 20),
            Text('driverApplicationReceived'.tr(), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 26)),
            const SizedBox(height: 8),
            Text('driverApplicationReceivedBody'.tr(), style: const TextStyle(color: WeretTokens.textSecondary, height: 1.45)),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: WeretTokens.surface,
                borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
                border: Border.all(color: WeretTokens.border.withValues(alpha: 0.6)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('driverApplicationStatusHeader'.tr(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: WeretTokens.textSecondary)),
                  const SizedBox(height: 12),
                  _StatusRow(icon: Icons.person_outline, title: 'driverProfilePersonal'.tr(), status: _status('personalInfo')),
                  _StatusRow(icon: Icons.directions_car_outlined, title: 'driverVehicleInfo'.tr(), status: _status('vehicleReg')),
                  _StatusRow(icon: Icons.account_balance_outlined, title: 'driverBanking'.tr(), status: _status('banking')),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text('driverWhatsNext'.tr(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            const SizedBox(height: 12),
            DriverTimelineStep(
              title: 'driverNextDocVerification'.tr(),
              subtitle: 'driverNextDocVerificationBody'.tr(),
              status: _status('identityDocs'),
              isLast: false,
              active: true,
            ),
            DriverTimelineStep(
              title: 'driverNextBackground'.tr(),
              subtitle: 'driverNextBackgroundBody'.tr(),
              status: _status('backgroundCheck'),
              isLast: false,
            ),
            DriverTimelineStep(
              title: 'driverNextActivation'.tr(),
              subtitle: 'driverNextActivationBody'.tr(),
              status: 'pending',
              isLast: true,
            ),
            const SizedBox(height: 24),
            CustomButton(title: 'driverGoHome'.tr(), onPressed: () => context.go('/driver/home')),
            TextButton(onPressed: () => context.push('/driver/verification-status'), child: Text('driverViewStatusDetails'.tr())),
            const SizedBox(height: 8),
            Text.rich(
              TextSpan(
                text: '${'driverNeedHelp'.tr()} ',
                style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 13),
                children: [TextSpan(text: 'driverContactSupport'.tr(), style: const TextStyle(color: WeretTokens.brand, fontWeight: FontWeight.w700))],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusRow extends StatelessWidget {
  const _StatusRow({required this.icon, required this.title, required this.status});
  final IconData icon;
  final String title;
  final String status;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: WeretTokens.textSecondary),
          const SizedBox(width: 12),
          Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w600))),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: WeretTokens.inputFill, borderRadius: BorderRadius.circular(999)),
            child: Text('driverStepStatus_$status'.tr(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}

class DriverVerificationStatusScreen extends ConsumerStatefulWidget {
  const DriverVerificationStatusScreen({super.key});

  @override
  ConsumerState<DriverVerificationStatusScreen> createState() => _DriverVerificationStatusScreenState();
}

class _DriverVerificationStatusScreenState extends ConsumerState<DriverVerificationStatusScreen> {
  Map<String, dynamic>? _verification;
  bool _loading = true;
  String? _fetchError;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ref.read(authProvider.notifier).fetchDriverApplication();
      if (data == null) {
        try {
          await ref.read(driverProvider.notifier).fetchDashboard();
          final dash = ref.read(driverProvider).dashboard;
          if (mounted) {
            setState(() {
              _verification = dash?['verification'] as Map<String, dynamic>?;
              _loading = false;
              _fetchError = null;
            });
          }
          await ref.read(authProvider.notifier).validateSession();
          return;
        } catch (_) {
          if (mounted) {
            setState(() {
              _loading = false;
              _fetchError = 'Failed to load status';
            });
          }
          return;
        }
      }
      if (mounted) {
        setState(() {
          _verification = data['verification'] as Map<String, dynamic>?;
          _loading = false;
          _fetchError = null;
        });
      }
      await ref.read(authProvider.notifier).validateSession();
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _fetchError = 'Failed to load status';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
      final progress = (_verification?['overallProgress'] as num?)?.toInt() ?? 0;
    final steps = Map<String, dynamic>.from(_verification?['steps'] as Map? ?? {});
    final estRaw = _verification?['estimatedCompletionDate'];
    final est = DateTime.tryParse('$estRaw');
    final estLabel = est != null ? DateFormat.yMMMd().format(est) : '—';
    final appStatus = _verification?['applicationStatus'] as String? ?? '';
    final reviewNote = _verification?['reviewNote'] as String? ?? '';

    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(title: Text('driverVerificationProgress'.tr())),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _fetchError != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.cloud_off, size: 48, color: WeretTokens.textSecondary),
                        const SizedBox(height: 12),
                        Text(_fetchError!, style: const TextStyle(color: WeretTokens.error, fontSize: 15), textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        FilledButton(onPressed: _load, child: const Text('Retry')),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      const DriverWordmark(),
                      const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: WeretTokens.surface,
                      borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
                      border: Border.all(color: WeretTokens.border.withValues(alpha: 0.6)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.assignment_outlined, color: WeretTokens.brand),
                            const SizedBox(width: 8),
                            Expanded(child: Text('driverVerificationProgress'.tr(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16))),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text('driverVerificationProgressBody'.tr(), style: const TextStyle(color: WeretTokens.textSecondary, height: 1.4, fontSize: 13)),
                        const SizedBox(height: 16),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(999),
                          child: LinearProgressIndicator(value: progress / 100, minHeight: 8, backgroundColor: WeretTokens.borderSubtle, color: WeretTokens.brand),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('driverProgressComplete'.tr(namedArgs: {'pct': '$progress'}), style: const TextStyle(fontWeight: FontWeight.w700, color: WeretTokens.brand)),
                            Text('driverEstCompletion'.tr(namedArgs: {'date': estLabel}), style: const TextStyle(fontSize: 12, color: WeretTokens.textSecondary)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  if (appStatus == 'rejected') ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: WeretTokens.error.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
                        border: Border.all(color: WeretTokens.error.withValues(alpha: 0.3)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.cancel_outlined, color: WeretTokens.error),
                              const SizedBox(width: 8),
                              Text('driverApplicationRejected'.tr(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: WeretTokens.error)),
                            ],
                          ),
                          if (reviewNote.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(reviewNote, style: const TextStyle(color: WeretTokens.textSecondary, height: 1.4, fontSize: 13)),
                          ],
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: () {},
                              icon: const Icon(Icons.support_agent_outlined, size: 18),
                              label: Text('driverContactSupport'.tr()),
                              style: OutlinedButton.styleFrom(foregroundColor: WeretTokens.error, side: const BorderSide(color: WeretTokens.error)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                  DriverTimelineStep(
                    title: 'driverStepPersonal'.tr(),
                    subtitle: 'driverStepPersonalBody'.tr(),
                    status: '${steps['personalInfo'] ?? 'pending'}',
                    isLast: false,
                  ),
                  DriverTimelineStep(
                    title: 'driverStepIdentity'.tr(),
                    subtitle: 'driverStepIdentityBody'.tr(),
                    status: '${steps['identityDocs'] ?? 'pending'}',
                    isLast: false,
                  ),
                  DriverTimelineStep(
                    title: 'driverStepVehicle'.tr(),
                    subtitle: 'driverStepVehicleBody'.tr(),
                    status: '${steps['vehicleReg'] ?? 'pending'}',
                    isLast: false,
                  ),
                  DriverTimelineStep(
                    title: 'driverStepBackground'.tr(),
                    subtitle: 'driverStepBackgroundBody'.tr(),
                    status: '${steps['backgroundCheck'] ?? 'pending'}',
                    isLast: true,
                  ),
                  const SizedBox(height: 16),
                  DriverInfoBanner(text: 'driverOnboardingHelp'.tr()),
                  const SizedBox(height: 16),
                  CustomButton(title: 'driverRefreshStatus'.tr(), onPressed: _load),
                  const SizedBox(height: 10),
                  CustomButton(title: 'driverContactSupport'.tr(), variant: ButtonVariant.outlined, onPressed: () {}),
                ],
              ),
            ),
    );
  }
}
