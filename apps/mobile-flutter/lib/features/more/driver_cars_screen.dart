import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/driver_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/api_error_message.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/shimmer_loading.dart';
import '../../shared/widgets/weret_page_scaffold.dart';
import '../../shared/widgets/weret_text_field.dart';

class DriverCarsScreen extends ConsumerStatefulWidget {
  const DriverCarsScreen({super.key});

  @override
  ConsumerState<DriverCarsScreen> createState() => _DriverCarsScreenState();
}

class _DriverCarsScreenState extends ConsumerState<DriverCarsScreen> {
  final _brand = TextEditingController();
  final _model = TextEditingController();
  final _color = TextEditingController();
  final _plate = TextEditingController();
  bool _adding = false;
  bool _showForm = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(driverProvider.notifier).refresh());
  }

  @override
  void dispose() {
    _brand.dispose();
    _model.dispose();
    _color.dispose();
    _plate.dispose();
    super.dispose();
  }

  Widget _carShimmer() {
    return ShimmerLoading(
      isLoading: true,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: WeretTokens.surface,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            ShimmerBox(width: 48, height: 48, borderRadius: BorderRadius.circular(8)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ShimmerBox(height: 14, width: 160),
                  const SizedBox(height: 8),
                  ShimmerBox(height: 10, width: 100),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _addCar() async {
    if (_brand.text.trim().isEmpty || _model.text.trim().isEmpty) return;
    setState(() => _adding = true);
    try {
      await ref.read(driverProvider.notifier).addCar({
        'brand': _brand.text.trim(),
        'model': _model.text.trim(),
        'color': _color.text.trim().isEmpty ? 'white' : _color.text.trim(),
        'plateNumber': _plate.text.trim().isEmpty ? 'N/A' : _plate.text.trim(),
        'seats': 4,
        'imageUrl': 'https://placehold.co/400x240/png?text=Car',
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('driverCarAdded'.tr())));
        setState(() => _showForm = false);
        _brand.clear();
        _model.clear();
        _color.clear();
        _plate.clear();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final driver = ref.watch(driverProvider);
    final status = driver.status ?? {};
    final selectedId = '${status['selectedCarId'] ?? ''}';
    final cars = driver.cars;

    return WeretPageScaffold(
      title: 'driverMenuShipping'.tr(),
      body: RefreshIndicator(
        onRefresh: () => ref.read(driverProvider.notifier).refresh(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            Text('driverCarsHint'.tr(), style: const TextStyle(color: WeretTokens.textSecondary, height: 1.4)),
            const SizedBox(height: 16),
            if (driver.loading && cars.isEmpty)
              ...List.generate(3, (_) => _carShimmer())
            else if (cars.isEmpty)
              EmptyState(
                icon: Icons.directions_car_outlined,
                title: 'noVehicles'.tr(),
                subtitle: 'driverCarsEmpty'.tr(),
                action: CustomButton(title: 'driverCarAdd'.tr(), onPressed: () => setState(() => _showForm = true)),
              )
            else
              ...cars.map((c) {
                final car = Map<String, dynamic>.from(c as Map);
                final id = '${car['_id'] ?? ''}';
                final active = id.isNotEmpty && id == selectedId;
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: active ? WeretTokens.brand.withValues(alpha: 0.08) : WeretTokens.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: active ? WeretTokens.brand : WeretTokens.border.withValues(alpha: 0.7)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${car['brand'] ?? ''} ${car['model'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                            Text('${car['color'] ?? ''} · ${car['plateNumber'] ?? ''}', style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 12)),
                            if (active)
                              Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Text('driverActiveCar'.tr(), style: const TextStyle(color: WeretTokens.brand, fontWeight: FontWeight.w700, fontSize: 11)),
                              ),
                          ],
                        ),
                      ),
                      if (!active && id.isNotEmpty)
                        TextButton(
                          onPressed: () => ref.read(driverProvider.notifier).setActiveCar(id),
                          child: Text('driverSetActiveCar'.tr()),
                        ),
                    ],
                  ),
                );
              }),
            const SizedBox(height: 12),
            if (_showForm) ...[
              WeretTextField(label: 'driverCarBrand'.tr(), controller: _brand),
              WeretTextField(label: 'driverCarModel'.tr(), controller: _model),
              WeretTextField(label: 'driverCarColor'.tr(), controller: _color),
              WeretTextField(label: 'driverCarPlate'.tr(), controller: _plate),
              const SizedBox(height: 8),
              CustomButton(title: 'driverCarSave'.tr(), loading: _adding, onPressed: _addCar),
              const SizedBox(height: 8),
            ] else
              CustomButton(title: 'driverCarAdd'.tr(), onPressed: () => setState(() => _showForm = true)),
          ],
        ),
      ),
    );
  }
}
