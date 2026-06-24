# Flutter Migration Report

Generated: 2026-06-20T23:15:08.642Z

## Summary

| Metric | Count |
|--------|------:|
| React Native source files scanned | 149 |
| Flutter artifacts created/updated | 2 |
| Skipped (already present) | 147 |

### By kind
- **other**: 14
- **api**: 1
- **widget**: 44
- **hook**: 4
- **locale**: 2
- **navigation**: 10
- **realtime**: 2
- **screen**: 49
- **provider**: 5
- **util**: 18

## Monorepo layout

```
project-root/
├── apps/
│   ├── mobile-flutter/     ← Flutter app (iOS + Android)
│   └── web/                ← admin UI
├── backend/                ← Express API
├── shared/                 ← constants + API contract
├── assets/                 ← shared images
├── docs/
└── backend/src/mongo/      ← MongoDB ODM + schema
```

**React Native removed** — see `docs/RN_REMOVED.md`.

## React Native → Flutter file map

| RN file | Flutter file | Kind | Status |
|---------|--------------|------|--------|
| `animation\presets.js` | `legacy_mirror/animation/presets.dart` | other | exists |
| `api\client.js` | `core/api/client.dart` | api | exists |
| `components\admin\AdminBottomSheet.js` | `shared/widgets/admin/admin_bottom_sheet.dart` | widget | exists |
| `components\admin\AdminPulsingShield.js` | `shared/widgets/admin/admin_pulsing_shield.dart` | widget | exists |
| `components\auth\WeretBrandMark.js` | `shared/widgets/auth/weret_brand_mark.dart` | widget | exists |
| `components\auth\WeretEmailContinueButton.js` | `shared/widgets/auth/weret_email_continue_button.dart` | widget | exists |
| `components\auth\WeretOutlineWordmark.js` | `shared/widgets/auth/weret_outline_wordmark.dart` | widget | exists |
| `components\auth\WeretPillButton.js` | `shared/widgets/auth/weret_pill_button.dart` | widget | exists |
| `components\auth\WeretTextField.js` | `shared/widgets/auth/weret_text_field.dart` | widget | exists |
| `components\auth\WeretWordmarkOnLight.js` | `shared/widgets/auth/weret_wordmark_on_light.dart` | widget | exists |
| `components\ConnectionStatusBanner.js` | `shared/widgets/connection_status_banner.dart` | widget | exists |
| `components\CustomButton.js` | `shared/widgets/custom_button.dart` | widget | exists |
| `components\DriverCard.js` | `shared/widgets/driver_card.dart` | widget | exists |
| `components\DriverDrawerMenu.js` | `shared/widgets/driver_drawer_menu.dart` | widget | exists |
| `components\EmptyState.js` | `shared/widgets/empty_state.dart` | widget | exists |
| `components\InputField.js` | `shared/widgets/input_field.dart` | widget | exists |
| `components\LanguageBar.js` | `shared/widgets/language_bar.dart` | widget | exists |
| `components\map\DriverMapMarker.js` | `shared/widgets/map/driver_map_marker.dart` | widget | exists |
| `components\mascot\CarMascot.js` | `shared/widgets/mascot/car_mascot.dart` | widget | exists |
| `components\passenger\PassengerMapPickerModal.js` | `shared/widgets/passenger/passenger_map_picker_modal.dart` | widget | exists |
| `components\passenger\PassengerWeretHero.js` | `shared/widgets/passenger/passenger_weret_hero.dart` | widget | exists |
| `components\PassengerSeatBookingBlock.js` | `shared/widgets/passenger_seat_booking_block.dart` | widget | exists |
| `components\RateDriverModal.js` | `shared/widgets/rate_driver_modal.dart` | widget | exists |
| `components\ReportUserModal.js` | `shared/widgets/report_user_modal.dart` | widget | exists |
| `components\RideCard.js` | `shared/widgets/ride_card.dart` | widget | exists |
| `components\RideStatusBanner.js` | `shared/widgets/ride_status_banner.dart` | widget | exists |
| `components\ServiceTypeChip.js` | `shared/widgets/service_type_chip.dart` | widget | exists |
| `components\TabHeaderQuickActions.js` | `shared/widgets/tab_header_quick_actions.dart` | widget | exists |
| `components\ui\FormErrorCallout.js` | `shared/widgets/ui/form_error_callout.dart` | widget | exists |
| `components\ui\PressableScale.js` | `shared/widgets/ui/pressable_scale.dart` | widget | exists |
| `components\ui\SectionSurface.js` | `shared/widgets/ui/section_surface.dart` | widget | exists |
| `components\ui\StaggerEntrance.js` | `shared/widgets/ui/stagger_entrance.dart` | widget | exists |
| `components\ui\SuccessFlash.js` | `shared/widgets/ui/success_flash.dart` | widget | exists |
| `components\ui\weret\WeretAmbientBackground.js` | `shared/widgets/ui/weret/weret_ambient_background.dart` | widget | exists |
| `components\ui\weret\WeretInfoScreen.js` | `shared/widgets/ui/weret/weret_info_screen.dart` | widget | exists |
| `components\ui\weret\WeretListScreen.js` | `shared/widgets/ui/weret/weret_list_screen.dart` | widget | exists |
| `components\ui\weret\WeretMenuHero.js` | `shared/widgets/ui/weret/weret_menu_hero.dart` | widget | exists |
| `components\ui\weret\WeretOptionCard.js` | `shared/widgets/ui/weret/weret_option_card.dart` | widget | exists |
| `components\ui\weret\WeretScreenHeader.js` | `shared/widgets/ui/weret/weret_screen_header.dart` | widget | exists |
| `components\ui\weret\WeretSheetHandle.js` | `shared/widgets/ui/weret/weret_sheet_handle.dart` | widget | exists |
| `components\ui\weret\WeretStepHeader.js` | `shared/widgets/ui/weret/weret_step_header.dart` | widget | exists |
| `components\ui\weret\WeretStepProgress.js` | `shared/widgets/ui/weret/weret_step_progress.dart` | widget | exists |
| `components\ui\weret\WeretStickyFooter.js` | `shared/widgets/ui/weret/weret_sticky_footer.dart` | widget | exists |
| `components\ui\weret\WeretSurfaceCard.js` | `shared/widgets/ui/weret/weret_surface_card.dart` | widget | exists |
| `components\ui\weret\WeretUploadCard.js` | `shared/widgets/ui/weret/weret_upload_card.dart` | widget | exists |
| `components\VehicleCard.js` | `shared/widgets/vehicle_card.dart` | widget | exists |
| `config\supabase.js` | removed | legacy | use REST + MongoDB Atlas |
| `constants\fixedAdminEmails.js` | `legacy_mirror/constants/fixed_admin_emails.dart` | other | exists |
| `constants\passengerSeatUnits.js` | `legacy_mirror/constants/passenger_seat_units.dart` | other | exists |
| `constants\vehicleTypes.js` | `legacy_mirror/constants/vehicle_types.dart` | other | exists |
| `constants\walletTypes.js` | `legacy_mirror/constants/wallet_types.dart` | other | exists |
| `context\ThemeProvider.js` | `legacy_mirror/context/theme_provider.dart` | other | exists |
| `hooks\usePolling.js` | `core/hooks/use_polling.dart` | hook | exists |
| `hooks\useWeretGoogleIdToken.js` | `core/hooks/use_weret_google_id_token.dart` | hook | exists |
| `hooks\useWeretGoogleSignIn.js` | `core/hooks/use_weret_google_sign_in.dart` | hook | exists |
| `hooks\useWeretScreenChrome.js` | `core/hooks/use_weret_screen_chrome.dart` | hook | exists |
| `i18n\index.js` | `legacy_mirror/i18n/index.dart` | other | exists |
| `locales\ar.json` | `l10n/ar` | locale | copied |
| `locales\en.json` | `l10n/en` | locale | copied |
| `navigation\AdminMoreStack.js` | `core/router/admin_more_stack.dart` | navigation | exists |
| `navigation\AdminTabNavigator.js` | `core/router/admin_tab_navigator.dart` | navigation | exists |
| `navigation\DriverMoreStack.js` | `core/router/driver_more_stack.dart` | navigation | exists |
| `navigation\DriverTabNavigator.js` | `core/router/driver_tab_navigator.dart` | navigation | exists |
| `navigation\PassengerMoreStack.js` | `core/router/passenger_more_stack.dart` | navigation | exists |
| `navigation\PassengerTabNavigator.js` | `core/router/passenger_tab_navigator.dart` | navigation | exists |
| `navigation\RootNavigator.js` | `core/router/root_navigator.dart` | navigation | exists |
| `navigation\usePassengerTabScreenOptions.js` | `core/router/use_passenger_tab_screen_options.dart` | navigation | exists |
| `navigation\useTabScreenOptions.js` | `core/router/use_tab_screen_options.dart` | navigation | exists |
| `navigation\useWeretTabScreenOptions.js` | `core/router/use_weret_tab_screen_options.dart` | navigation | exists |
| `realtime\RealtimeBridge.js` | `core/realtime/realtime_bridge.dart` | realtime | exists |
| `realtime\socket.js` | `core/realtime/socket.dart` | realtime | exists |
| `screens\AdminAuditLogScreen.js` | `features/auth/admin_audit_log_screen.dart` | screen | exists |
| `screens\AdminDashboardScreen.js` | `features/auth/admin_dashboard_screen.dart` | screen | exists |
| `screens\AdminReportsScreen.js` | `features/auth/admin_reports_screen.dart` | screen | exists |
| `screens\AdminRidesScreen.js` | `features/auth/admin_rides_screen.dart` | screen | exists |
| `screens\AdminTransactionsScreen.js` | `features/auth/admin_transactions_screen.dart` | screen | exists |
| `screens\AdminUsersScreen.js` | `features/auth/admin_users_screen.dart` | screen | exists |
| `screens\DriverCarEditorScreen.js` | `features/auth/driver_car_editor_screen.dart` | screen | exists |
| `screens\DriverCarsScreen.js` | `features/auth/driver_cars_screen.dart` | screen | exists |
| `screens\DriverHistoryScreen.js` | `features/auth/driver_history_screen.dart` | screen | exists |
| `screens\DriverHomeScreen.js` | `features/auth/driver_home_screen.dart` | screen | exists |
| `screens\DriverOnboardingScreen.js` | `features/auth/driver_onboarding_screen.dart` | screen | exists |
| `screens\DriverPaymentMethodsScreen.js` | `features/auth/driver_payment_methods_screen.dart` | screen | exists |
| `screens\DriverRegisterScreen.js` | `features/auth/driver_register_screen.dart` | screen | exists |
| `screens\DriverVehicleCategoryScreen.js` | `features/auth/driver_vehicle_category_screen.dart` | screen | exists |
| `screens\DriverVehiclePickerScreen.js` | `features/auth/driver_vehicle_picker_screen.dart` | screen | exists |
| `screens\DriverWalletScreen.js` | `features/auth/driver_wallet_screen.dart` | screen | exists |
| `screens\InAppCallScreen.js` | `features/auth/in_app_call_screen.dart` | screen | exists |
| `screens\LoginScreen.js` | `features/auth/login_screen.dart` | screen | exists |
| `screens\more\AboutWeretScreen.js` | `features/more/about_weret_screen.dart` | screen | exists |
| `screens\more\AdminMoreMenuScreen.js` | `features/more/admin_more_menu_screen.dart` | screen | exists |
| `screens\more\AdminToolsScreen.js` | `features/more/admin_tools_screen.dart` | screen | exists |
| `screens\more\DriverDemandScreen.js` | `features/more/driver_demand_screen.dart` | screen | exists |
| `screens\more\DriverEarningsScreen.js` | `features/more/driver_earnings_screen.dart` | screen | exists |
| `screens\more\DriverInsightsScreen.js` | `features/more/driver_insights_screen.dart` | screen | exists |
| `screens\more\DriverMoreMenuScreen.js` | `features/more/driver_more_menu_screen.dart` | screen | exists |
| `screens\more\DriverRatingsScreen.js` | `features/more/driver_ratings_screen.dart` | screen | exists |
| `screens\more\DriverTripFlowScreen.js` | `features/more/driver_trip_flow_screen.dart` | screen | exists |
| `screens\more\DriverVehicleScreen.js` | `features/more/driver_vehicle_screen.dart` | screen | exists |
| `screens\more\HelpCenterScreen.js` | `features/more/help_center_screen.dart` | screen | exists |
| `screens\more\ModeSwitchRow.js` | `features/more/mode_switch_row.dart` | screen | exists |
| `screens\more\MoreMenuRow.js` | `features/more/more_menu_row.dart` | screen | exists |
| `screens\more\NotificationSettingsScreen.js` | `features/more/notification_settings_screen.dart` | screen | exists |
| `screens\more\PassengerMoreMenuScreen.js` | `features/more/passenger_more_menu_screen.dart` | screen | exists |
| `screens\more\RideTipsScreen.js` | `features/more/ride_tips_screen.dart` | screen | exists |
| `screens\more\SafetyTipsScreen.js` | `features/more/safety_tips_screen.dart` | screen | exists |
| `screens\more\SavedPlacesScreen.js` | `features/more/saved_places_screen.dart` | screen | exists |
| `screens\PassengerHistoryScreen.js` | `features/auth/passenger_history_screen.dart` | screen | exists |
| `screens\PassengerHomeScreen.js` | `features/auth/passenger_home_screen.dart` | screen | exists |
| `screens\PassengerRegisterScreen.js` | `features/auth/passenger_register_screen.dart` | screen | exists |
| `screens\RegisterChoiceScreen.js` | `features/auth/register_choice_screen.dart` | screen | exists |
| `screens\RegisterScreen.js` | `features/auth/register_screen.dart` | screen | exists |
| `screens\RideChatScreen.js` | `features/auth/ride_chat_screen.dart` | screen | exists |
| `screens\SettingsScreen.js` | `features/auth/settings_screen.dart` | screen | exists |
| `screens\wallet\WalletAddAccountScreen.js` | `features/wallet/wallet_add_account_screen.dart` | screen | exists |
| `screens\wallet\WalletDepositScreen.js` | `features/wallet/wallet_deposit_screen.dart` | screen | exists |
| `screens\wallet\WalletHistoryScreen.js` | `features/wallet/wallet_history_screen.dart` | screen | exists |
| `screens\wallet\WalletOverviewScreen.js` | `features/wallet/wallet_overview_screen.dart` | screen | exists |
| `screens\wallet\WalletWithdrawScreen.js` | `features/wallet/wallet_withdraw_screen.dart` | screen | exists |
| `screens\WeretOnboardingScreen.js` | `features/auth/weret_onboarding_screen.dart` | screen | exists |
| `store\index.js` | `legacy_mirror/store/index.dart` | other | exists |
| `store\slices\authSlice.js` | `core/providers/auth_provider.dart` | provider | exists |
| `store\slices\driverSlice.js` | `core/providers/driver_provider.dart` | provider | exists |
| `store\slices\rideSlice.js` | `core/providers/ride_provider.dart` | provider | exists |
| `store\slices\uiSlice.js` | `core/providers/ui_provider.dart` | provider | exists |
| `store\slices\walletSlice.js` | `core/providers/wallet_provider.dart` | provider | exists |
| `theme\tokens.js` | `legacy_mirror/theme/tokens.dart` | other | exists |
| `theme\weretAuth.js` | `legacy_mirror/theme/weret_auth.dart` | other | exists |
| `theme\weretDesignSystem.js` | `legacy_mirror/theme/weret_design_system.dart` | other | exists |
| `theme\weretMotion.js` | `legacy_mirror/theme/weret_motion.dart` | other | exists |
| `theme\weretPassenger.js` | `legacy_mirror/theme/weret_passenger.dart` | other | exists |
| `utils\aiFareSuggest.js` | `core/utils/ai_fare_suggest.dart` | util | exists |
| `utils\aiPlaceRerank.js` | `core/utils/ai_place_rerank.dart` | util | exists |
| `utils\apiErrors.js` | `core/utils/api_errors.dart` | util | exists |
| `utils\autocompletePlaces.js` | `core/utils/autocomplete_places.dart` | util | exists |
| `utils\googleOAuthErrors.js` | `core/utils/google_o_auth_errors.dart` | util | exists |
| `utils\googleSignInEnvironment.js` | `core/utils/google_sign_in_environment.dart` | util | exists |
| `utils\mapboxPlaces.js` | `core/utils/mapbox_places.dart` | util | exists |
| `utils\mapCoords.js` | `core/utils/map_coords.dart` | util | exists |
| `utils\mapProvider.js` | `core/utils/map_provider.dart` | util | exists |
| `utils\nativeGoogleSignIn.js` | `core/utils/native_google_sign_in.dart` | util | exists |
| `utils\placeSearch.js` | `core/utils/place_search.dart` | util | exists |
| `utils\routePolyline.js` | `core/utils/route_polyline.dart` | util | exists |
| `utils\runNativeGoogleSignIn.js` | `core/utils/run_native_google_sign_in.dart` | util | exists |
| `utils\serviceTypeIcons.js` | `core/utils/service_type_icons.dart` | util | exists |
| `utils\showAlert.js` | `core/utils/show_alert.dart` | util | exists |
| `utils\tripFare.js` | `core/utils/trip_fare.dart` | util | exists |
| `utils\uploadUrl.js` | `core/utils/upload_url.dart` | util | exists |
| `utils\weretServiceTypeGallery.js` | `core/utils/weret_service_type_gallery.dart` | util | exists |

## Missing dependencies (install Flutter SDK first)

Run from `apps/mobile-flutter`:

```bash
flutter pub get
```

Required SDK: Flutter 3.24+ / Dart 3.5+

## Potential issues

1. **Flutter SDK not installed** on dev machine — run `flutter doctor` after install.
2. **WebRTC** requires platform-specific setup (`flutter_webrtc`).
3. **Google Sign-In** needs platform OAuth clients + `.env` / dart-define.
4. **Maps** — RN used `react-native-maps`; Flutter uses `flutter_map` + OSM tiles (no Google key required).
5. **Screen stubs** — generated screens preserve routes; full UI/logic ported incrementally from `apps/mobile-legacy`.
6. **MongoDB Atlas** — set `MONGODB_URI` in `backend/.env`; run `npm run mongo:test-atlas`.
7. **Root `mobile/` folder** may remain if locked by Metro; use `apps/mobile-legacy` as source of truth.

## Unresolved / manual follow-up

- [ ] Install Flutter SDK and run `flutter analyze`
- [ ] Port complex screens: `PassengerHomeScreen`, `DriverHomeScreen`, `RideChatScreen`, `InAppCallScreen`
- [ ] Wire Google Sign-In native config (Android/iOS)
- [ ] Push notifications (RN had local toggles only — no FCM yet)
- [ ] Delete or archive root `mobile/` after stopping Expo
