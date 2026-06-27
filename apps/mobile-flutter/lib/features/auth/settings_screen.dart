import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/auth_interceptor.dart';
import '../../core/constants/vehicle_types.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/ui_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/logout_action.dart';
import '../../core/utils/show_alert.dart';
import '../../core/utils/api_error_message.dart';
import '../../shared/widgets/weret_ambient_background.dart';
import '../../shared/widgets/weret_list_screen.dart';
import '../../shared/widgets/weret_text_field.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/weret_pill_toggle.dart';
import '../../shared/widgets/weret_section_card.dart';
import '../../shared/widgets/ui/stagger_entrance.dart';
import '../../shared/widgets/ui/form_error_callout.dart';

const _gap = 8.0;

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});
  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  late final TextEditingController _phone;
  bool _phoneSaving = false;
  String? _phoneError;

  @override
  void initState() {
    super.initState();
    _phone = TextEditingController(text: ref.read(authProvider).user?.phone ?? '');
  }

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  Future<void> _savePhone() async {
    HapticFeedback.mediumImpact();
    setState(() => _phoneError = null);
    try {
      setState(() => _phoneSaving = true);
      await ref.read(authProvider.notifier).updateProfile({'phone': _phone.text.trim()});
      if (!mounted) return;
      showAlert(context, 'success'.tr(), 'phoneSaved'.tr());
    } catch (e) {
      if (!mounted) return;
      setState(() => _phoneError = '$e');
    } finally {
      if (mounted) setState(() => _phoneSaving = false);
    }
  }

  void _onVehicleChanged(String vt) {
    HapticFeedback.lightImpact();
    ref.read(authProvider.notifier).updateProfile({'vehicleType': vt});
  }

  Future<void> _deleteAccount() async {
    HapticFeedback.mediumImpact();
    final auth = ref.read(authProvider);
    String? password;
    final hasGoogle = auth.user?.googleSub != null && '${auth.user?.googleSub}'.isNotEmpty;

    if (!hasGoogle) {
      final pwCtrl = TextEditingController();
      password = await showDialog<String>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text('deleteAccount'.tr()),
          content: TextField(
            controller: pwCtrl,
            obscureText: true,
            decoration: InputDecoration(labelText: 'password'.tr()),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text('cancel'.tr())),
            TextButton(onPressed: () => Navigator.pop(ctx, pwCtrl.text), child: Text('confirm'.tr())),
          ],
        ),
      );
      pwCtrl.dispose();
      if (password == null || password.isEmpty) return;
    } else {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text('deleteAccount'.tr()),
          content: Text('deleteAccountConfirm'.tr()),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text('cancel'.tr())),
            TextButton(onPressed: () => Navigator.pop(ctx, true), child: Text('confirm'.tr())),
          ],
        ),
      );
      if (confirmed != true) return;
    }

    try {
      await ref.read(authProvider.notifier).deleteAccount(password: password);
      if (!mounted) return;
      Navigator.pushNamedAndRemoveUntil(context, '/login', (_) => false);
    } catch (e) {
      if (!mounted) return;
      showAlert(context, 'error'.tr(), localizedApiError(e, fallbackKey: 'error'));
    }
  }

  void _setTheme(ThemeMode mode) {
    HapticFeedback.lightImpact();
    ref.read(themeModeProvider.notifier).setMode(mode);
  }

  void _setLocale(String code) {
    HapticFeedback.lightImpact();
    context.setLocale(Locale(code));
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final themeMode = ref.watch(themeModeProvider);
    final locale = context.locale.languageCode;
    final base = ApiConfig.baseUrl;

    final sections = <Widget>[
      WeretPageTitle(title: 'settings'.tr()),
      if (user?.role == 'admin')
        _AdminPanelSection(base: base),
      if (user?.role != 'admin') ...[
        _PhoneSection(
          controller: _phone,
          saving: _phoneSaving,
          error: _phoneError,
          onSave: _savePhone,
        ),
      ],
      if (user?.effectiveRole == 'driver')
        _VehicleSection(user: user, onChanged: _onVehicleChanged),
      _LanguageSection(locale: locale, onChanged: _setLocale),
      _ThemeSection(themeMode: themeMode, onSelect: _setTheme),
      const _SafetySection(),
      _AccountSection(ref: ref, onDelete: _deleteAccount),
    ];

    return Scaffold(
      backgroundColor: WeretTokens.bg,
      body: WeretAmbientBackground(
        child: SafeArea(
          child: WeretListScreen(
            child: StaggerEntrance(
              spacing: 0,
              children: sections,
            ),
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Extracted Sections
// ═══════════════════════════════════════════════════════════════════════

class _AdminPanelSection extends StatelessWidget {
  const _AdminPanelSection({required this.base});
  final String base;

  @override
  Widget build(BuildContext context) {
    return WeretSectionCard(
      title: 'adminWebPanel'.tr(),
      subtitle: 'adminWebPanelHint'.tr(),
      footer: SelectableText('$base/admin-ui/', textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: WeretTokens.textSecondary)),
      child: CustomButton(
        title: 'openAdminWeb'.tr(),
        onPressed: () async {
          final url = Uri.parse('$base/admin-ui/?api=${Uri.encodeComponent(base)}');
          await launchUrl(url, mode: LaunchMode.externalApplication);
        },
      ),
    );
  }
}

class _PhoneSection extends StatelessWidget {
  const _PhoneSection({
    required this.controller,
    required this.saving,
    required this.error,
    required this.onSave,
  });
  final TextEditingController controller;
  final bool saving;
  final String? error;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    return WeretSectionCard(
      title: 'phoneForCalls'.tr(),
      child: Column(
        children: [
          WeretTextField(
            label: 'phoneOptional'.tr(),
            controller: controller,
            keyboardType: TextInputType.phone,
            hint: 'phonePlaceholder'.tr(),
          ),
          const SizedBox(height: _gap),
          CustomButton(title: 'savePhone'.tr(), onPressed: onSave, loading: saving),
          if (error != null) ...[
            const SizedBox(height: _gap),
            FormErrorCallout(message: error!),
          ],
        ],
      ),
    );
  }
}

class _VehicleSection extends StatelessWidget {
  const _VehicleSection({required this.user, required this.onChanged});
  final dynamic user;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return WeretSectionCard(
      title: 'driverVehicleClass'.tr(),
      subtitle: 'driverVehicleClassHint'.tr(),
      child: Wrap(
        spacing: _gap,
        runSpacing: _gap,
        children: driverVehicleTypes.map((vt) {
          final selected = (user?.vehicleType ?? 'delivery') == vt;
          return FilterChip(
            label: Text('vehicleType_$vt'.tr()),
            selected: selected,
            onSelected: (_) => onChanged(vt),
          );
        }).toList(),
      ),
    );
  }
}

class _LanguageSection extends StatelessWidget {
  const _LanguageSection({required this.locale, required this.onChanged});
  final String locale;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return WeretSectionCard(
      title: 'language'.tr(),
      footer: Text(
        'roleSwitchHint'.tr(),
        textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 11, color: WeretTokens.textSecondary, height: 1.4),
      ),
      child: WeretPillToggle<String>(
        value: locale,
        options: const ['ar', 'en'],
        labelBuilder: (v) => v == 'ar' ? 'arabic'.tr() : 'english'.tr(),
        onChanged: onChanged,
      ),
    );
  }
}

class _ThemeSection extends StatelessWidget {
  const _ThemeSection({required this.themeMode, required this.onSelect});
  final ThemeMode themeMode;
  final ValueChanged<ThemeMode> onSelect;

  @override
  Widget build(BuildContext context) {
    return WeretSectionCard(
      title: 'theme'.tr(),
      child: Column(
        children: [
          WeretStackOption(
            label: 'themeSystem'.tr(),
            selected: themeMode == ThemeMode.system,
            onTap: () => onSelect(ThemeMode.system),
          ),
          const SizedBox(height: _gap),
          WeretStackOption(
            label: 'themeLight'.tr(),
            selected: themeMode == ThemeMode.light,
            onTap: () => onSelect(ThemeMode.light),
          ),
          const SizedBox(height: _gap),
          WeretStackOption(
            label: 'themeDark'.tr(),
            selected: themeMode == ThemeMode.dark,
            onTap: () => onSelect(ThemeMode.dark),
          ),
        ],
      ),
    );
  }
}

class _SafetySection extends StatelessWidget {
  const _SafetySection();

  @override
  Widget build(BuildContext context) {
    return WeretSectionCard(
      title: 'Safety',
      child: Column(
        children: [
          CustomButton(
            title: 'sosTitle'.tr(),
            variant: 'outline',
            onPressed: () => context.push('/safety/emergency'),
          ),
          const SizedBox(height: _gap),
          CustomButton(
            title: 'trustedTitle'.tr(),
            variant: 'outline',
            onPressed: () => context.push('/safety/trusted-contacts'),
          ),
          const SizedBox(height: _gap),
          CustomButton(
            title: 'blockedTitle'.tr(),
            variant: 'outline',
            onPressed: () => context.push('/safety/blocked'),
          ),
        ],
      ),
    );
  }
}

class _AccountSection extends StatelessWidget {
  const _AccountSection({required this.ref, required this.onDelete});
  final WidgetRef ref;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return WeretSectionCard(
      title: 'account'.tr(),
      child: Column(
        children: [
          CustomButton(
            title: 'logout'.tr(),
            variant: 'outline',
            onPressed: () => performLogout(ref, context),
          ),
          const SizedBox(height: _gap + 4),
          CustomButton(
            title: 'deleteAccount'.tr(),
            variant: 'outline',
            onPressed: onDelete,
          ),
        ],
      ),
    );
  }
}
