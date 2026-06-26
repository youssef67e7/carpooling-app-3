import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api/auth_interceptor.dart';
import '../../core/constants/vehicle_types.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/ui_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/logout_action.dart';
import '../../shared/widgets/weret_ambient_background.dart';
import '../../shared/widgets/weret_list_screen.dart';
import '../../shared/widgets/weret_text_field.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/weret_pill_toggle.dart';
import '../../shared/widgets/weret_section_card.dart';
import '../../core/utils/show_alert.dart';
import '../../core/utils/api_error_message.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});
  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  late final TextEditingController _phone;

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

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final user = auth.user;
    final themeMode = ref.watch(themeModeProvider);
    final locale = context.locale.languageCode;
    final base = ApiConfig.baseUrl;

    return Scaffold(
      backgroundColor: WeretTokens.bg,
      body: WeretAmbientBackground(
        child: SafeArea(
          child: WeretListScreen(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                WeretPageTitle(title: 'settings'.tr()),
                if (user?.role == 'admin')
                  WeretSectionCard(
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
                  ),
                if (user?.role != 'admin') ...[
                  WeretSectionCard(
                    title: 'phoneForCalls'.tr(),
                    child: Column(
                      children: [
                        WeretTextField(label: 'phoneOptional'.tr(), controller: _phone, keyboardType: TextInputType.phone, hint: 'phonePlaceholder'.tr()),
                        CustomButton(
                          title: 'savePhone'.tr(),
                          onPressed: () async {
                            try {
                              await ref.read(authProvider.notifier).updateProfile({'phone': _phone.text.trim()});
                              if (context.mounted) showAlert(context, 'success'.tr(), 'phoneSaved'.tr());
                            } catch (e) {
                              if (context.mounted) showAlert(context, 'error'.tr(), '$e');
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                ],
                if (user?.effectiveRole == 'driver')
                  WeretSectionCard(
                    title: 'driverVehicleClass'.tr(),
                    subtitle: 'driverVehicleClassHint'.tr(),
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: driverVehicleTypes.map((vt) {
                        final selected = (user?.vehicleType ?? 'delivery') == vt;
                        return FilterChip(
                          label: Text('vehicleType_$vt'.tr()),
                          selected: selected,
                          onSelected: (_) => ref.read(authProvider.notifier).updateProfile({'vehicleType': vt}),
                        );
                      }).toList(),
                    ),
                  ),
                WeretSectionCard(
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
                    onChanged: (v) => context.setLocale(Locale(v)),
                  ),
                ),
                WeretSectionCard(
                  title: 'theme'.tr(),
                  child: Column(
                    children: [
                      WeretStackOption(
                        label: 'themeSystem'.tr(),
                        selected: themeMode == ThemeMode.system,
                        onTap: () => ref.read(themeModeProvider.notifier).setMode(ThemeMode.system),
                      ),
                      const SizedBox(height: 8),
                      WeretStackOption(
                        label: 'themeLight'.tr(),
                        selected: themeMode == ThemeMode.light,
                        onTap: () => ref.read(themeModeProvider.notifier).setMode(ThemeMode.light),
                      ),
                      const SizedBox(height: 8),
                      WeretStackOption(
                        label: 'themeDark'.tr(),
                        selected: themeMode == ThemeMode.dark,
                        onTap: () => ref.read(themeModeProvider.notifier).setMode(ThemeMode.dark),
                      ),
                    ],
                  ),
                ),
                WeretSectionCard(
                  title: 'account'.tr(),
                  child: Column(
                    children: [
                      CustomButton(
                        title: 'logout'.tr(),
                        variant: 'outline',
                        onPressed: () => performLogout(ref, context),
                      ),
                      const SizedBox(height: 12),
                      CustomButton(
                        title: 'deleteAccount'.tr(),
                        variant: 'outline',
                        onPressed: () async {
                          final auth = ref.read(authProvider);
                          String? password;
                          final hasGoogle = auth.user?.googleSub != null && '${auth.user?.googleSub}'.isNotEmpty;
                          if (!hasGoogle) {
                            final pwCtrl = TextEditingController();
                            final pw = await showDialog<String>(
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
                            password = pw;
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
                            if (context.mounted) {
                              Navigator.pushNamedAndRemoveUntil(context, '/login', (_) => false);
                            }
                          } catch (e) {
                            if (context.mounted) {
                              showAlert(context, 'error'.tr(), localizedApiError(e, fallbackKey: 'error'));
                            }
                          }
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
