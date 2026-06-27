import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/admin_provider.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/weret_ambient_background.dart';
import '../../shared/widgets/weret_logo.dart';
import '../../shared/widgets/admin/admin_dashboard_widgets.dart';
import '../../shared/widgets/admin/admin_moderation_sheet.dart';
import '../../shared/widgets/admin/admin_pulsing_shield.dart';
import '../../shared/widgets/admin/admin_search_header.dart';
import '../../shared/widgets/admin/admin_status_badge.dart';
import '../../shared/widgets/admin_cards.dart';

const _pad = 16.0;
const _sm = 8.0;

// ─── Dashboard ───────────────────────────────────────────────────────────────

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  DateTime? _lastStatsAt;

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadStats);
  }

  Future<void> _loadStats() async {
    HapticFeedback.mediumImpact();
    await ref.read(adminProvider.notifier).fetchStats();
    if (mounted) setState(() => _lastStatsAt = DateTime.now());
  }

  int _intStat(Map<String, dynamic> stats, String key) => (stats[key] as num?)?.toInt() ?? 0;

  @override
  Widget build(BuildContext context) {
    final admin = ref.watch(adminProvider);
    final stats = admin.stats ?? {};
    final name = ref.watch(authProvider).user?.name ?? 'admin'.tr();
    final ridesByStatus = stats['ridesByStatus'];
    final statusMap = ridesByStatus is Map ? ridesByStatus.cast<String, dynamic>() : <String, dynamic>{};
    final openReports = _intStat(stats, 'openReports');
    final pendingDrivers = _intStat(stats, 'pendingDrivers');
    final flaggedTx = _intStat(stats, 'flaggedTx');

    return Scaffold(
      backgroundColor: WeretTokens.bg,
      body: WeretAmbientBackground(
        child: RefreshIndicator(
          onRefresh: _loadStats,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: _DashboardHeader(name: name),
              ),
              if (admin.statsLoading && stats.isEmpty)
                const SliverToBoxAdapter(child: Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator(strokeWidth: 2))))
              else if (admin.statsError != null && stats.isEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(admin.statsError!, style: const TextStyle(color: WeretTokens.error)),
                  ),
                )
              else ...[
                SliverToBoxAdapter(
                  child: AdminCommandBanner(
                    driversOnline: _intStat(stats, 'driversOnline'),
                    activeRides: _intStat(stats, 'activeRides'),
                    openReports: openReports,
                    updatedAt: _lastStatsAt,
                  ),
                ),
                _KpiRow(
                  items: [
                    _KpiItem(label: 'totalUsers'.tr(), value: '${stats['totalUsers'] ?? '—'}', icon: Icons.people_alt_outlined),
                    _KpiItem(label: 'totalRides'.tr(), value: '${stats['totalRides'] ?? '—'}', icon: Icons.route_outlined),
                    _KpiItem(label: 'driversOnline'.tr(), value: '${stats['driversOnline'] ?? '—'}', icon: Icons.sensors_outlined, tone: AdminKpiTone.green),
                    _KpiItem(label: 'activeRides'.tr(), value: '${stats['activeRides'] ?? '—'}', icon: Icons.local_taxi_outlined, tone: AdminKpiTone.green),
                  ],
                ),
                _KpiRow(
                  paddingTop: 10,
                  items: [
                    _KpiItem(label: 'adminCompletedRides'.tr(), value: '${stats['completedRides'] ?? '—'}', icon: Icons.check_circle_outline, tone: AdminKpiTone.gray),
                    _KpiItem(label: 'adminAvgRating'.tr(), value: '${stats['averageRating'] ?? '—'}', icon: Icons.star_outline),
                    _KpiItem(label: 'adminTotalRatings'.tr(), value: '${stats['totalRatings'] ?? '—'}', icon: Icons.rate_review_outlined),
                    _KpiItem(label: 'adminOpenReports'.tr(), value: '$openReports', icon: Icons.flag_outlined, tone: AdminKpiTone.green, alert: openReports > 0),
                    _KpiItem(label: 'adminPendingDrivers'.tr(), value: '$pendingDrivers', icon: Icons.badge_outlined, alert: pendingDrivers > 0),
                    _KpiItem(label: 'adminFlaggedTx'.tr(), value: '$flaggedTx', icon: Icons.warning_amber_outlined, tone: AdminKpiTone.gray, alert: flaggedTx > 0),
                    _KpiItem(label: 'adminTotalDrivers'.tr(), value: '${stats['totalDrivers'] ?? '—'}', icon: Icons.airport_shuttle_outlined, tone: AdminKpiTone.green),
                  ],
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(_pad, 18, _pad, _sm),
                    child: Text('adminStats'.tr(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                  ),
                ),
                SliverToBoxAdapter(child: AdminRideStatusChart(ridesByStatus: statusMap)),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(_pad, 18, _pad, _sm),
                    child: Text('adminCommandDeck'.tr(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                  ),
                ),
                _QuickChipsRow(
                  pendingDrivers: pendingDrivers,
                  activeRides: _intStat(stats, 'activeRides'),
                  openReports: openReports,
                  flaggedTx: flaggedTx,
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(_pad, 18, _pad, _sm),
                    child: Text('adminRecentActivity'.tr(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                  ),
                ),
                SliverToBoxAdapter(
                  child: AdminActivityFeed(
                    recentRides: stats['recentRides'] is List ? stats['recentRides'] as List : const [],
                    recentActivity: stats['recentActivity'] is List ? stats['recentActivity'] as List : const [],
                  ),
                ),
              ],
              const SliverPadding(padding: EdgeInsets.only(bottom: 24)),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Dashboard extracted widgets ────────────────────────────────────────────

class _DashboardHeader extends StatelessWidget {
  const _DashboardHeader({required this.name});
  final String name;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(_pad, 20, _pad, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const WeretLogo.chip(),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('adminDashboardTitle'.tr(), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 26, letterSpacing: -0.5)),
                    const SizedBox(height: 6),
                    Text('adminDashboardSubtitle'.tr(), style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 13, height: 1.4)),
                  ],
                ),
              ),
              const AdminPulsingShield(size: 44),
            ],
          ),
          const SizedBox(height: _sm),
          Text(name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: WeretTokens.brand)),
        ],
      ),
    );
  }
}

class _KpiItem {
  const _KpiItem({
    required this.label,
    required this.value,
    required this.icon,
    this.tone = AdminKpiTone.gray,
    this.alert = false,
  });
  final String label;
  final String value;
  final IconData icon;
  final AdminKpiTone tone;
  final bool alert;
}

class _KpiRow extends StatelessWidget {
  const _KpiRow({required this.items, this.paddingTop = _pad});
  final List<_KpiItem> items;
  final double paddingTop;

  @override
  Widget build(BuildContext context) {
    return SliverToBoxAdapter(
      child: SizedBox(
        height: 92,
        child: ListView(
          scrollDirection: Axis.horizontal,
          padding: EdgeInsets.fromLTRB(_pad, paddingTop, _pad, 0),
          children: List.generate(items.length, (i) {
            final item = items[i];
            return Padding(
              padding: EdgeInsets.only(left: i > 0 ? 10 : 0),
              child: AdminKpiCard(
                label: item.label,
                value: item.value,
                icon: item.icon,
                tone: item.tone,
                alert: item.alert,
              ),
            );
          }),
        ),
      ),
    );
  }
}

class _QuickChipsRow extends StatelessWidget {
  const _QuickChipsRow({
    required this.pendingDrivers,
    required this.activeRides,
    required this.openReports,
    required this.flaggedTx,
  });
  final int pendingDrivers;
  final int activeRides;
  final int openReports;
  final int flaggedTx;

  @override
  Widget build(BuildContext context) {
    return SliverToBoxAdapter(
      child: SizedBox(
        height: 118,
        child: ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: _pad),
          children: [
            AdminQuickChip(icon: Icons.people_outline, label: 'adminUsers'.tr(), badge: pendingDrivers > 0 ? pendingDrivers : null, onTap: () => context.go('/admin/users')),
            const SizedBox(width: 10),
            AdminQuickChip(icon: Icons.map_outlined, label: 'adminRides'.tr(), badge: activeRides > 0 ? activeRides : null, onTap: () => context.go('/admin/rides')),
            const SizedBox(width: 10),
            AdminQuickChip(icon: Icons.flag_outlined, label: 'adminReportsTitle'.tr(), badge: openReports > 0 ? openReports : null, onTap: () => context.push('/admin/more/reports')),
            const SizedBox(width: 10),
            AdminQuickChip(icon: Icons.receipt_long_outlined, label: 'adminTransactionsTitle'.tr(), badge: flaggedTx > 0 ? flaggedTx : null, onTap: () => context.push('/admin/more/transactions')),
            const SizedBox(width: 10),
            AdminQuickChip(icon: Icons.list_alt_outlined, label: 'adminAuditTitle'.tr(), onTap: () => context.push('/admin/more/audit')),
          ],
        ),
      ),
    );
  }
}

// ─── Users ───────────────────────────────────────────────────────────────────

class AdminUsersScreen extends ConsumerStatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  ConsumerState<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends ConsumerState<AdminUsersScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(adminProvider.notifier).fetchUsers(page: 1));
  }

  @override
  Widget build(BuildContext context) {
    final slice = ref.watch(adminProvider).users;
    return WeretAdminListScaffold(
      title: 'adminUsers'.tr(),
      slice: slice,
      emptyLabel: 'noUsers'.tr(),
      onSearch: (q) => ref.read(adminProvider.notifier).fetchUsers(page: 1, search: q),
      onRefresh: () => ref.read(adminProvider.notifier).fetchUsers(page: slice.pagination.page),
      onPrev: () => ref.read(adminProvider.notifier).fetchUsers(page: slice.pagination.page - 1),
      onNext: () => ref.read(adminProvider.notifier).fetchUsers(page: slice.pagination.page + 1),
      itemBuilder: (c, i) => AdminUserCard(
        user: slice.items[i],
        onModerate: () => AdminModerationSheet.show(context, slice.items[i]),
      ),
    );
  }
}

// ─── Rides ───────────────────────────────────────────────────────────────────

class AdminRidesScreen extends ConsumerStatefulWidget {
  const AdminRidesScreen({super.key});

  @override
  ConsumerState<AdminRidesScreen> createState() => _AdminRidesScreenState();
}

class _AdminRidesScreenState extends ConsumerState<AdminRidesScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(adminProvider.notifier).fetchRides(page: 1));
  }

  @override
  Widget build(BuildContext context) {
    final slice = ref.watch(adminProvider).rides;
    return WeretAdminListScaffold(
      title: 'adminRides'.tr(),
      slice: slice,
      emptyLabel: 'noRidesAdmin'.tr(),
      onSearch: (q) => ref.read(adminProvider.notifier).fetchRides(page: 1, search: q),
      onRefresh: () => ref.read(adminProvider.notifier).fetchRides(page: slice.pagination.page),
      onPrev: () => ref.read(adminProvider.notifier).fetchRides(page: slice.pagination.page - 1),
      onNext: () => ref.read(adminProvider.notifier).fetchRides(page: slice.pagination.page + 1),
      itemBuilder: (c, i) => AdminRideCard(ride: slice.items[i]),
    );
  }
}

// ─── Reports ─────────────────────────────────────────────────────────────────

class AdminReportsScreen extends ConsumerStatefulWidget {
  const AdminReportsScreen({super.key});

  @override
  ConsumerState<AdminReportsScreen> createState() => _AdminReportsScreenState();
}

class _AdminReportsScreenState extends ConsumerState<AdminReportsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(adminProvider.notifier).fetchReports(page: 1));
  }

  @override
  Widget build(BuildContext context) {
    final slice = ref.watch(adminProvider).reports;
    return WeretAdminListScaffold(
      title: 'adminReportsTitle'.tr(),
      slice: slice,
      emptyLabel: 'adminReportsEmpty'.tr(),
      showBack: true,
      onSearch: (q) => ref.read(adminProvider.notifier).fetchReports(page: 1, search: q),
      onRefresh: () => ref.read(adminProvider.notifier).fetchReports(page: slice.pagination.page),
      onPrev: () => ref.read(adminProvider.notifier).fetchReports(page: slice.pagination.page - 1),
      onNext: () => ref.read(adminProvider.notifier).fetchReports(page: slice.pagination.page + 1),
      itemBuilder: (c, i) => _AdminReportCard(report: slice.items[i]),
    );
  }
}

class _AdminReportCard extends ConsumerStatefulWidget {
  const _AdminReportCard({required this.report});
  final Map<String, dynamic> report;

  @override
  ConsumerState<_AdminReportCard> createState() => _AdminReportCardState();
}

class _AdminReportCardState extends ConsumerState<_AdminReportCard> {
  bool _busy = false;

  String _person(dynamic v) {
    if (v is Map) return '${v['name'] ?? v['email'] ?? '—'}';
    return '—';
  }

  @override
  Widget build(BuildContext context) {
    final report = widget.report;
    final id = '${report['_id'] ?? report['id'] ?? ''}';
    final status = '${report['status'] ?? 'open'}';
    const statuses = ['open', 'reviewing', 'resolved', 'dismissed'];

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: WeretTokens.surface,
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
        border: Border.all(color: WeretTokens.border.withValues(alpha: 0.75)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              AdminStatusBadge(label: 'reportStatus_$status'.tr(), tone: status == 'open' ? AdminBadgeTone.wait : AdminBadgeTone.neutral),
              const Spacer(),
              Text('#${id.length > 6 ? id.substring(id.length - 6) : id}', style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 11)),
            ],
          ),
          const SizedBox(height: 10),
          Text('${report['reason'] ?? '—'}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
          const SizedBox(height: 6),
          Text('${report['description'] ?? ''}', maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 13)),
          const SizedBox(height: 8),
          Text('${'passenger'.tr()}: ${_person(report['reporterId'] ?? report['reporter'])}', style: const TextStyle(fontSize: 12)),
          Text('→ ${_person(report['reportedUserId'] ?? report['reportedUser'])}', style: const TextStyle(fontSize: 12)),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            initialValue: statuses.contains(status) ? status : 'open',
            decoration: InputDecoration(
              labelText: 'adminReportSetStatus'.tr(),
              filled: true,
              fillColor: WeretTokens.inputFill.withValues(alpha: 0.45),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
            items: statuses
                .map((s) => DropdownMenuItem(value: s, child: Text('reportStatus_$s'.tr())))
                .toList(),
            onChanged: _busy
                ? null
                : (next) async {
                    if (next == null || next == status) return;
                    setState(() => _busy = true);
                    final err = await ref.read(adminProvider.notifier).updateReportStatus(id, next);
                    if (!context.mounted) return;
                    setState(() => _busy = false);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(err ?? 'adminActionDone'.tr())),
                    );
                  },
          ),
        ],
      ),
    );
  }
}

// ─── Transactions ────────────────────────────────────────────────────────────

class AdminTransactionsScreen extends ConsumerStatefulWidget {
  const AdminTransactionsScreen({super.key});

  @override
  ConsumerState<AdminTransactionsScreen> createState() => _AdminTransactionsScreenState();
}

class _AdminTransactionsScreenState extends ConsumerState<AdminTransactionsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(adminProvider.notifier).fetchTransactions(page: 1));
  }

  @override
  Widget build(BuildContext context) {
    final slice = ref.watch(adminProvider).transactions;
    return WeretAdminListScaffold(
      title: 'adminTransactionsTitle'.tr(),
      slice: slice,
      emptyLabel: 'adminTransactionsEmpty'.tr(),
      showBack: true,
      onSearch: (q) => ref.read(adminProvider.notifier).fetchTransactions(page: 1, search: q),
      onRefresh: () => ref.read(adminProvider.notifier).fetchTransactions(page: slice.pagination.page),
      onPrev: () => ref.read(adminProvider.notifier).fetchTransactions(page: slice.pagination.page - 1),
      onNext: () => ref.read(adminProvider.notifier).fetchTransactions(page: slice.pagination.page + 1),
      itemBuilder: (c, i) => _AdminTransactionCard(tx: slice.items[i]),
    );
  }
}

class _AdminTransactionCard extends ConsumerWidget {
  const _AdminTransactionCard({required this.tx});
  final Map<String, dynamic> tx;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final id = '${tx['_id'] ?? tx['id'] ?? ''}';
    final flagged = tx['flagged'] == true;
    final user = tx['userId'] is Map ? (tx['userId'] as Map)['email'] : tx['userEmail'];
    final type = '${tx['type'] ?? '—'}';
    final typeKey = 'txType_$type';
    final typeLabel = typeKey.tr();
    final amount = tx['amount'] ?? tx['value'] ?? '—';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: flagged ? const Color(0xFFFFF1F2) : WeretTokens.surface,
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
        border: Border.all(color: flagged ? WeretTokens.error.withValues(alpha: 0.35) : WeretTokens.border.withValues(alpha: 0.75)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: Text(typeLabel == typeKey ? type : typeLabel, style: const TextStyle(fontWeight: FontWeight.w800))),
              Text('$amount', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
            ],
          ),
          const SizedBox(height: 6),
          Text('$user', style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 12)),
          if (flagged) Padding(padding: const EdgeInsets.only(top: 6), child: AdminStatusBadge(label: 'adminTxFlagged'.tr(), tone: AdminBadgeTone.bad)),
          const SizedBox(height: 10),
          FilledButton.tonal(
            onPressed: () async {
              if (!flagged) {
                final ok = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: Text('adminTxFlagConfirmTitle'.tr()),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text('cancel'.tr())),
                      FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text('confirm'.tr())),
                    ],
                  ),
                );
                if (ok != true) return;
              }
              final err = await ref.read(adminProvider.notifier).setTransactionFlag(
                    id,
                    flagged: !flagged,
                    reason: flagged ? null : 'adminTxFlagDefault'.tr(),
                  );
              if (!context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err ?? 'adminActionDone'.tr())));
            },
            child: Text(flagged ? 'adminTxUnflag'.tr() : 'adminTxFlag'.tr()),
          ),
        ],
      ),
    );
  }
}

// ─── Audit ───────────────────────────────────────────────────────────────────

class AdminAuditLogScreen extends ConsumerStatefulWidget {
  const AdminAuditLogScreen({super.key});

  @override
  ConsumerState<AdminAuditLogScreen> createState() => _AdminAuditLogScreenState();
}

class _AdminAuditLogScreenState extends ConsumerState<AdminAuditLogScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(adminProvider.notifier).fetchAudit(page: 1));
  }

  @override
  Widget build(BuildContext context) {
    final slice = ref.watch(adminProvider).audit;
    return WeretAdminListScaffold(
      title: 'adminAuditTitle'.tr(),
      slice: slice,
      emptyLabel: 'adminAuditEmpty'.tr(),
      showBack: true,
      onSearch: (q) => ref.read(adminProvider.notifier).fetchAudit(page: 1, search: q),
      onRefresh: () => ref.read(adminProvider.notifier).fetchAudit(page: slice.pagination.page),
      onPrev: () => ref.read(adminProvider.notifier).fetchAudit(page: slice.pagination.page - 1),
      onNext: () => ref.read(adminProvider.notifier).fetchAudit(page: slice.pagination.page + 1),
      itemBuilder: (c, i) => _AdminAuditCard(log: slice.items[i]),
    );
  }
}

class _AdminAuditCard extends StatelessWidget {
  const _AdminAuditCard({required this.log});
  final Map<String, dynamic> log;

  @override
  Widget build(BuildContext context) {
    final targetId = '${log['targetId'] ?? ''}';
    final shortId = targetId.length > 8 ? targetId.substring(targetId.length - 8) : targetId;
    final actor = log['actorAdminId'] is Map ? (log['actorAdminId'] as Map)['email'] : log['actorEmail'];
    final whenRaw = log['createdAt'] ?? log['created_at'];
    final when = whenRaw != null ? DateTime.tryParse('$whenRaw') : null;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: WeretTokens.inputFill.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
        border: Border.all(color: WeretTokens.border.withValues(alpha: 0.7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${log['action'] ?? '—'}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
          const SizedBox(height: 6),
          Text('${log['summary'] ?? ''}', style: const TextStyle(fontSize: 13)),
          const SizedBox(height: 8),
          Text('${'adminAuditActor'.tr()}: ${actor ?? '—'}', style: const TextStyle(fontSize: 12, color: WeretTokens.textSecondary)),
          Text('${'adminAuditTarget'.tr()}: ${log['targetType'] ?? '—'} · $shortId', style: const TextStyle(fontSize: 12, color: WeretTokens.textSecondary)),
          if (when != null)
            Text(DateFormat.yMd(context.locale.toString()).add_jm().format(when), style: const TextStyle(fontSize: 11, color: WeretTokens.textSecondary)),
        ],
      ),
    );
  }
}

// ─── Tools ───────────────────────────────────────────────────────────────────

class AdminToolsScreen extends ConsumerWidget {
  const AdminToolsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(adminProvider).stats;
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(title: Text('adminToolsTitle'.tr().split('·').last.trim())),
      body: WeretAmbientBackground(
        child: ListView(
          padding: const EdgeInsets.all(_pad),
          children: [
            Container(
              padding: const EdgeInsets.all(_pad),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
                gradient: LinearGradient(colors: [WeretTokens.brand, WeretTokens.brand.withValues(alpha: 0.82)]),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.phone_iphone_rounded, color: Colors.white),
                  const SizedBox(height: 10),
                  Text('adminToolsLiveHint'.tr(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, height: 1.35)),
                ],
              ),
            ),
            const SizedBox(height: 14),
            if (stats != null) ...[
              Text('adminStats'.tr(), style: const TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: _sm),
              _ToolStatRow(label: 'totalUsers'.tr(), value: '${stats['totalUsers'] ?? 0}'),
              _ToolStatRow(label: 'activeRides'.tr(), value: '${stats['activeRides'] ?? 0}'),
              _ToolStatRow(label: 'driversOnline'.tr(), value: '${stats['driversOnline'] ?? 0}'),
            ],
            const SizedBox(height: 12),
            Text('adminToolsBody'.tr(), style: const TextStyle(color: WeretTokens.textSecondary, height: 1.4)),
          ],
        ),
      ),
    );
  }
}

class _ToolStatRow extends StatelessWidget {
  const _ToolStatRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: _sm),
      child: Row(
        children: [
          Expanded(child: Text(label)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }
}

// ─── Shared list scaffold ────────────────────────────────────────────────────

class WeretAdminListScaffold extends StatelessWidget {
  const WeretAdminListScaffold({
    super.key,
    required this.title,
    required this.slice,
    required this.emptyLabel,
    required this.onSearch,
    required this.onRefresh,
    required this.onPrev,
    required this.onNext,
    required this.itemBuilder,
    this.showBack = false,
  });

  final String title;
  final AdminListSlice slice;
  final String emptyLabel;
  final ValueChanged<String> onSearch;
  final VoidCallback onRefresh;
  final VoidCallback onPrev;
  final VoidCallback onNext;
  final Widget Function(BuildContext, int) itemBuilder;
  final bool showBack;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        leading: showBack ? IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()) : null,
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: WeretAmbientBackground(
        child: Column(
          children: [
            AdminSearchHeader(
              initialSearch: slice.search,
              onSearch: onSearch,
              onRefresh: onRefresh,
              loading: slice.loading,
            ),
            if (slice.error != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: _pad, vertical: 4),
                child: Text(slice.error!, style: const TextStyle(color: WeretTokens.error, fontSize: 12)),
              ),
            Expanded(
              child: slice.loading && slice.items.isEmpty
                  ? const Center(child: CircularProgressIndicator(strokeWidth: 2))
                  : slice.items.isEmpty
                      ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(emptyLabel)))
                      : RefreshIndicator(
                          onRefresh: () async => onRefresh(),
                          child: ListView.builder(
                            padding: const EdgeInsets.fromLTRB(_pad, _sm, _pad, 0),
                            itemCount: slice.items.length,
                            itemBuilder: itemBuilder,
                          ),
                        ),
            ),
            AdminPaginationBar(pagination: slice.pagination, onPrev: onPrev, onNext: onNext),
          ],
        ),
      ),
    );
  }
}
