/// Canonical API paths — mirrors shared/services/apiEndpoints.js
class ApiEndpoints {
  ApiEndpoints._();

  static const health = '/health';
  static const authMe = '/auth/me';
  static const authGoogleConfig = '/auth/google-config';
  static const authGoogle = '/auth/google';
  static const authLogin = '/auth/login';
  static const authRegister = '/auth/register';
  static const authForgotPassword = '/auth/forgot-password';
  static const authResetPassword = '/auth/reset-password';
  static const authProfile = '/auth/profile';
  static const authVerifyPassword = '/auth/verify-password';
  static const switchRole = '/switch-role';

  static const driverApplicationMe = '/driver-application/me';
  static const driverApplicationSubmit = '/driver-application/submit';
  static const driverDashboard = '/driver/dashboard';
  static const driverStatus = '/driver/status';
  static const driverEarningsSummary = '/driver/earnings-summary';
  static const driverCars = '/driver/cars';
  static String driverCar(String id) => '/driver/cars/$id';
  static String driverCarSetActive(String id) => '/driver/cars/$id/set-active';
  static const driverToggleStatus = '/driver/toggle-status';
  static const driverLocationUpdate = '/driver/location-update';
  static const driverBonuses = '/driver/bonuses';
  static const driverHeatmap = '/driver/heatmap';
  static const driverBreakMode = '/driver/break-mode';

  static const passengerLocationUpdate = '/passenger/location-update';

  static const vehicles = '/vehicles';
  static const ridesNearbyDrivers = '/rides/nearby-drivers';
  static const ridesRoutePreview = '/rides/route-preview';
  static const ridesCreate = '/rides/create';
  static String ride(String id) => '/rides/$id';
  static String rideStatus(String id) => '/rides/$id/status';
  static String rideMessages(String id) => '/rides/$id/messages';
  static const ridesHistory = '/rides/history';
  static const ridesAvailable = '/rides/available';
  static const ridesMyActive = '/rides/my-active';
  static String ridesAccept(String id) => '/rides/$id/accept';
  static const ridesRespondProposal = '/rides/respond-proposal';
  static const ridesPassengerMinFare = '/rides/passenger-min-fare';
  static const ridesDriverConfirmBooking = '/rides/driver-confirm-booking';
  static const ridesWithdrawOffer = '/rides/withdraw-offer';
  static const ridesStart = '/rides/start';
  static const ridesEnd = '/rides/end';
  static String ridesArriving(String id) => '/rides/$id/arriving';
  static String ridesOnboard(String id) => '/rides/$id/onboard';
  static String ridesCancel(String id) => '/rides/$id/cancel';
  static String ridesDriverCancel(String id) => '/rides/$id/driver-cancel';
  static const ridesRate = '/rides/rate';
  static const ridesRatePassenger = '/rides/rate-passenger';
  static const ridesRatingsReceived = '/rides/ratings/received';
  static const ridesRatingsGiven = '/rides/ratings/given';
  static const ridesPoolMatches = '/rides/pool-matches';

  // Shared ride (peer-to-peer pooling) endpoints
  static String rideTogglePooling(String id) => '/rides/$id/toggle-pooling';
  static String rideRequestJoin(String id) => '/rides/$id/request-join';
  static String rideJoinRequests(String id) => '/rides/$id/join-requests';
  static String rideApproveJoin(String rideId, String bookingId) => '/rides/$rideId/approve-join/$bookingId';
  static String rideRejectJoin(String rideId, String bookingId) => '/rides/$rideId/reject-join/$bookingId';
  static String rideFareSplit(String id) => '/rides/$id/fare-split';

  static const walletAccounts = '/wallet/accounts';
  static const walletDeposit = '/wallet/deposit';
  static const walletWithdrawRequest = '/wallet/withdraw/request';
  static const walletWithdrawConfirm = '/wallet/withdraw/confirm';
  static const walletTransactions = '/wallet/transactions';
  static String walletAccountDelete(String id) => '/wallet/accounts/$id';
  static String walletAccountDefault(String id) => '/wallet/accounts/$id/default';

  static const adminUsers = '/admin/users';
  static String adminUser(String id) => '/admin/users/$id';
  static const adminRides = '/admin/rides';
  static const adminStats = '/admin/stats';
  static const adminReports = '/admin/reports';
  static String adminReport(String id) => '/admin/reports/$id';
  static const adminTransactions = '/admin/transactions';
  static const adminAudit = '/admin/audit';
  static String adminTransactionFlag(String id) => '/admin/transactions/$id/flag';

  static const reports = '/reports';
  static const disputes = '/disputes';
  static const disputesMine = '/disputes/mine';
  static String disputeMessages(String id) => '/disputes/$id/messages';
  static const disputesAdmin = '/disputes/admin';
  static String disputesAdminDetail(String id) => '/disputes/admin/$id';
  static String disputesAdminStatus(String id) => '/disputes/admin/$id/status';
  static const favoritesDrivers = '/favorites/drivers';
  static String favoriteDriverCheck(String id) => '/favorites/drivers/$id/check';
  static String favoriteDriverAdd(String id) => '/favorites/drivers/$id';
  static String favoriteDriverRemove(String id) => '/favorites/drivers/$id';
  static const carpoolsCreate = '/carpools/create';
  static const carpoolsSearch = '/carpools/search';
  static const carpoolsMine = '/carpools/mine';
  static String carpoolBook(String id) => '/carpools/$id/book';
  static String carpoolCancel(String id) => '/carpools/$id';
  static const prefs = '/prefs';
  static const promotions = '/promotions';
  static const referrals = '/referrals';
  static const upload = '/upload';

  static const authRefresh = '/auth/refresh';
  static const authLogout = '/auth/logout';
  static const authRegisterToken = '/auth/register-token';
  static const authEmailSendOtp = '/auth/email/send-otp';
  static const authEmailVerifyOtp = '/auth/email/verify-otp';
  static const authDeleteAccount = '/auth/delete-account';

  static const safetyEmergency = '/safety/emergency';
  static String safetyEmergencyResolve(String id) => '/safety/emergency/$id/resolve';
  static const safetyTrustedContacts = '/safety/trusted-contacts';
  static String safetyTrustedContact(String id) => '/safety/trusted-contacts/$id';
  static const safetyBlocked = '/safety/blocked';
  static String safetyBlock(String userId) => '/safety/block/$userId';
  static String safetyShareTrip(String rideId) => '/safety/share-trip/$rideId';

  static const places = '/places';
  static String place(String id) => '/places/$id';
  static String placeDefault(String id) => '/places/$id/default';
}
