import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/places_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/ui/section_surface.dart';
import '../../shared/widgets/ui/stagger_entrance.dart';
import '../../shared/widgets/weret_page_scaffold.dart';

class SavedPlacesScreen extends ConsumerStatefulWidget {
  const SavedPlacesScreen({super.key});
  @override
  ConsumerState<SavedPlacesScreen> createState() => _SavedPlacesScreenState();
}

class _SavedPlacesScreenState extends ConsumerState<SavedPlacesScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(placesProvider.notifier).fetchPlaces());
  }

  static const _iconMap = <String, IconData>{
    'home': Icons.home,
    'work': Icons.work,
    'gym': Icons.fitness_center,
    'school': Icons.school,
    'airport': Icons.flight_takeoff,
    'hospital': Icons.local_hospital,
    'shopping': Icons.shopping_bag,
    'park': Icons.park,
  };

  IconData _iconFor(String? icon) => _iconMap[icon] ?? Icons.place;

  void _showPlaceForm({Map<String, dynamic>? existing}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _PlaceFormSheet(
        existing: existing,
        iconFor: _iconFor,
        onSave: (data) async {
          try {
            if (existing != null) {
              await ref.read(placesProvider.notifier).updatePlace(
                    existing['_id'] as String,
                    data,
                  );
            } else {
              await ref.read(placesProvider.notifier).createPlace(data);
            }
            return null;
          } catch (e) {
            return e.toString();
          }
        },
      ),
    );
  }

  Future<void> _deletePlace(String id, String name) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => _DeletePlaceDialog(name: name),
    );
    if (confirmed == true) {
      await ref.read(placesProvider.notifier).deletePlace(id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(placesProvider);

    return WeretPageScaffold(
      title: 'featureSavedPlaces'.tr(),
      body: _buildBody(s),
      floatingActionButton: s.error == null && !s.loading
          ? FloatingActionButton(
              onPressed: () => _showPlaceForm(),
              child: const Icon(Icons.add),
            )
          : null,
    );
  }

  Widget _buildBody(PlaceState s) {
    if (s.loading && s.places.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (s.error != null && s.places.isEmpty) {
      return _ErrorState(
        message: s.error!,
        onRetry: () => ref.read(placesProvider.notifier).fetchPlaces(),
      );
    }

    if (s.places.isEmpty) {
      return _EmptySavedPlaces(onAdd: () => _showPlaceForm());
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(placesProvider.notifier).fetchPlaces(),
      child: ListView.builder(
        padding: const EdgeInsets.only(top: 8, bottom: 88),
        itemCount: s.places.length,
        itemBuilder: (_, i) {
          final p = s.places[i] as Map<String, dynamic>;
          return _PlaceTile(
            place: p,
            iconFor: _iconFor,
            onEdit: () => _showPlaceForm(existing: p),
            onDelete: () => _deletePlace(
              p['_id'] as String,
              p['name'] as String? ?? '',
            ),
            onSetDefault: () =>
                ref.read(placesProvider.notifier).setDefault(p['_id'] as String),
          );
        },
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════

class _PlaceTile extends StatelessWidget {
  final Map<String, dynamic> place;
  final IconData Function(String?) iconFor;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onSetDefault;

  const _PlaceTile({
    required this.place,
    required this.iconFor,
    required this.onEdit,
    required this.onDelete,
    required this.onSetDefault,
  });

  @override
  Widget build(BuildContext context) {
    final isDefault = place['isDefault'] == true;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: SectionSurface(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: isDefault ? WeretTokens.brand : WeretTokens.surface,
            child: Icon(
              iconFor(place['icon'] as String?),
              color: isDefault ? Colors.white : WeretTokens.brand,
            ),
          ),
          title: Text(
            place['name'] as String? ?? '',
            style: TextStyle(
              fontWeight: isDefault ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
          subtitle: Text(
            place['address'] as String? ?? '',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          trailing: PopupMenuButton<String>(
            onSelected: (action) {
              if (action == 'edit') {
                onEdit();
              } else if (action == 'delete') {
                onDelete();
              } else if (action == 'default') {
                onSetDefault();
              }
            },
            itemBuilder: (_) => [
              if (!isDefault)
                PopupMenuItem(value: 'default', child: Text('placeSetDefault'.tr())),
              PopupMenuItem(value: 'edit', child: Text('edit'.tr())),
              PopupMenuItem(value: 'delete', child: Text('delete'.tr())),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptySavedPlaces extends StatelessWidget {
  final VoidCallback onAdd;
  const _EmptySavedPlaces({required this.onAdd});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: StaggerEntrance(
          spacing: 8,
          children: [
            const Icon(Icons.bookmark_border, size: 64, color: WeretTokens.textMuted),
            Text(
              'savedIntro'.tr(),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            Text(
              'savedEmpty'.tr(),
              textAlign: TextAlign.center,
              style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 14),
            ),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add, size: 18),
              label: Text('placeAdd'.tr()),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_rounded, size: 56, color: WeretTokens.error),
            const SizedBox(height: 16),
            Text(
              'errorOccurred'.tr(),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 13),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: Text('retry'.tr()),
            ),
          ],
        ),
      ),
    );
  }
}

class _DeletePlaceDialog extends StatelessWidget {
  final String name;
  const _DeletePlaceDialog({required this.name});

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('placeDeleteTitle'.tr()),
      content: Text('placeDeleteBody'.tr(args: [name])),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: Text('cancel'.tr()),
        ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(true),
          child: Text('delete'.tr(), style: const TextStyle(color: WeretTokens.error)),
        ),
      ],
    );
  }
}

class _PlaceFormSheet extends StatefulWidget {
  final Map<String, dynamic>? existing;
  final IconData Function(String?) iconFor;
  final Future<String?> Function(Map<String, dynamic> data) onSave;

  const _PlaceFormSheet({
    required this.existing,
    required this.iconFor,
    required this.onSave,
  });

  @override
  State<_PlaceFormSheet> createState() => _PlaceFormSheetState();
}

class _PlaceFormSheetState extends State<_PlaceFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameCtrl;
  late final TextEditingController _addressCtrl;
  late final TextEditingController _latCtrl;
  late final TextEditingController _lngCtrl;
  String? _selectedIcon;
  bool _isDefault = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _nameCtrl = TextEditingController(text: e?['name'] as String? ?? '');
    _addressCtrl = TextEditingController(text: e?['address'] as String? ?? '');
    _latCtrl = TextEditingController(text: e?['lat']?.toString() ?? '');
    _lngCtrl = TextEditingController(text: e?['lng']?.toString() ?? '');
    _selectedIcon = e?['icon'] as String?;
    _isDefault = e?['isDefault'] == true;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _addressCtrl.dispose();
    _latCtrl.dispose();
    _lngCtrl.dispose();
    super.dispose();
  }

  static const _icons = [
    'home', 'work', 'gym', 'school', 'airport', 'hospital', 'shopping', 'park',
  ];

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final data = {
      'name': _nameCtrl.text.trim(),
      'address': _addressCtrl.text.trim(),
      'lat': double.parse(_latCtrl.text.trim()),
      'lng': double.parse(_lngCtrl.text.trim()),
      if (_selectedIcon != null) 'icon': _selectedIcon,
      'isDefault': _isDefault,
    };
    final error = await widget.onSave(data);
    if (!mounted) return;
    if (error != null) {
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error)),
      );
    } else {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                widget.existing != null ? 'placeEdit'.tr() : 'placeAdd'.tr(),
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _nameCtrl,
                decoration: InputDecoration(
                  labelText: 'placeName'.tr(),
                  border: const OutlineInputBorder(),
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'fieldRequired'.tr() : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _addressCtrl,
                decoration: InputDecoration(
                  labelText: 'placeAddress'.tr(),
                  border: const OutlineInputBorder(),
                ),
                maxLines: 2,
                validator: (v) => (v == null || v.trim().isEmpty) ? 'fieldRequired'.tr() : null,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _latCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Latitude',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) return 'fieldRequired'.tr();
                        if (double.tryParse(v.trim()) == null) return 'invalidNumber'.tr();
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _lngCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Longitude',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) return 'fieldRequired'.tr();
                        if (double.tryParse(v.trim()) == null) return 'invalidNumber'.tr();
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _selectedIcon,
                decoration: InputDecoration(
                  labelText: 'placeIcon'.tr(),
                  border: const OutlineInputBorder(),
                ),
                items: [
                  ..._icons.map((k) => DropdownMenuItem(
                        value: k,
                        child: Row(children: [
                          Icon(widget.iconFor(k), size: 20),
                          const SizedBox(width: 8),
                          Text('placeIcon${k[0].toUpperCase()}${k.substring(1)}'.tr()),
                        ]),
                      )),
                  DropdownMenuItem(
                    value: null,
                    child: Text('placeIconNone'.tr()),
                  ),
                ],
                onChanged: (v) => setState(() => _selectedIcon = v),
              ),
              const SizedBox(height: 12),
              CheckboxListTile(
                value: _isDefault,
                onChanged: (v) => setState(() => _isDefault = v ?? false),
                title: Text('placeSetDefault'.tr()),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _saving ? null : _submit,
                child: _saving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(widget.existing != null ? 'save'.tr() : 'add'.tr()),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
