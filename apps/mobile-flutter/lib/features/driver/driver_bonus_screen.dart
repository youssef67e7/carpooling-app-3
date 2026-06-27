import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/weret_tokens.dart';

class DriverBonusScreen extends ConsumerStatefulWidget {
  const DriverBonusScreen({super.key});
  @override
  ConsumerState<DriverBonusScreen> createState() => _DriverBonusScreenState();
}

class _DriverBonusScreenState extends ConsumerState<DriverBonusScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      final data = await api.getJson(ApiEndpoints.driverBonuses);
      setState(() { _data = Map<String, dynamic>.from(data as Map); _loading = false; });
    } catch (e) {
      setState(() { _error = '$e'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        title: Text('Bonus & Streaks', style: const TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text('$_error', style: const TextStyle(color: Colors.red)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _StreakCard(
                        todayTrips: (_data?['todayTrips'] as num?)?.toInt() ?? 0,
                        weekTrips: (_data?['weekTrips'] as num?)?.toInt() ?? 0,
                        streak: (_data?['currentStreak'] as num?)?.toInt() ?? 0,
                        streakGoal: (_data?['streakGoal'] as num?)?.toInt() ?? 5,
                      ),
                      const SizedBox(height: 20),
                      Text('Available Bonuses', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: WeretTokens.textPrimary)),
                      const SizedBox(height: 12),
                      ...(_data?['bonuses'] as List? ?? []).map((b) => _BonusCard(b: b as Map<String, dynamic>)),
                      if ((_data?['history'] as List?)?.isNotEmpty == true) ...[
                        const SizedBox(height: 24),
                        Text('Earned History', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: WeretTokens.textPrimary)),
                        const SizedBox(height: 12),
                        ...(_data!['history'] as List).map((h) => _HistoryItem(h: h as Map<String, dynamic>)),
                      ],
                    ],
                  ),
                ),
    );
  }
}

class _StreakCard extends StatelessWidget {
  const _StreakCard({required this.todayTrips, required this.weekTrips, required this.streak, required this.streakGoal});
  final int todayTrips;
  final int weekTrips;
  final int streak;
  final int streakGoal;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF1A237E), Color(0xFF283593)]),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _StatItem(label: 'Today', value: '$todayTrips', icon: Icons.today),
              _StatItem(label: 'This Week', value: '$weekTrips', icon: Icons.date_range),
              _StatItem(label: 'Streak', value: '$streak d', icon: Icons.local_fire_department),
            ],
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: streak >= streakGoal ? 1.0 : streak / streakGoal,
              backgroundColor: Colors.white24,
              color: streak >= streakGoal ? Colors.amber : Colors.white,
              minHeight: 8,
            ),
          ),
          const SizedBox(height: 8),
          Text('$streakGoal consecutive days for streak bonus', style: const TextStyle(color: Colors.white60, fontSize: 12)),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({required this.label, required this.value, required this.icon});
  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: Colors.white70, size: 22),
        const SizedBox(height: 6),
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 22)),
        Text(label, style: const TextStyle(color: Colors.white60, fontSize: 11)),
      ],
    );
  }
}

class _BonusCard extends StatelessWidget {
  const _BonusCard({required this.b});
  final Map<String, dynamic> b;

  @override
  Widget build(BuildContext context) {
    final achieved = b['achieved'] == true;
    final progress = (b['progress'] as num?)?.toInt() ?? 0;
    final target = (b['target'] as num?)?.toInt() ?? 1;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: achieved ? Colors.green.shade50 : WeretTokens.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: achieved ? Colors.green.shade200 : WeretTokens.borderSubtle),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: achieved ? Colors.green : WeretTokens.brand.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(achieved ? Icons.check_circle : Icons.emoji_events_outlined, color: achieved ? Colors.white : WeretTokens.brand),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${b['label'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: progress / target,
                    backgroundColor: WeretTokens.border,
                    color: achieved ? Colors.green : WeretTokens.brand,
                    minHeight: 6,
                  ),
                ),
                const SizedBox(height: 2),
                Text(achieved ? 'Completed!' : '$progress / $target', style: TextStyle(fontSize: 11, color: WeretTokens.textMuted)),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Text('\$${b['amount'] ?? 0}', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: achieved ? Colors.green : WeretTokens.textPrimary)),
        ],
      ),
    );
  }
}

class _HistoryItem extends StatelessWidget {
  const _HistoryItem({required this.h});
  final Map<String, dynamic> h;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: WeretTokens.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: WeretTokens.borderSubtle),
      ),
      child: Row(
        children: [
          Text('${h['type'] ?? ''}', style: TextStyle(color: WeretTokens.textPrimary, fontWeight: FontWeight.w500)),
          const Spacer(),
          Text('\$${(h['amount'] as num?)?.toInt() ?? 0}', style: TextStyle(fontWeight: FontWeight.w700, color: Colors.green.shade700)),
        ],
      ),
    );
  }
}
