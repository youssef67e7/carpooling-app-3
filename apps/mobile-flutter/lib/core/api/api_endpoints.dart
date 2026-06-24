/// Canonical API paths — mirrors shared/services/apiEndpoints.js
class ApiEndpoints {
  ApiEndpoints._();

  static const health = '/health';
  static const authMe = '/auth/me';
  static const authGoogleConfig = '/auth/google-config';
  static const authGoogle = '/auth/google';
  static const authPhoneOtp = '/auth/phone/otp';
  static const authPhoneVerify = '/auth/phone/verify';
  static const authLogin = '/auth/login';
  static const authRegister = '/auth/register';
  static const authForgotPassword = '/auth/forgot-password';
  static const authResetPassword = '/auth/reset-password';
  static const authProfile = '/auth/profile';
  static const authVerifyPassword = '/auth/verify-password';
  static const switchRole = '/switch-role';

  static const aiFareSuggest = '/ai/fare/suggest';
  static const aiPlacesRerank = '/ai/places/rerank';

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

  static const passengerLocationUpdate = '/passenger/location-update';

  static const vehicles = '/vehicles';
  static const ridesNearbyDrivers = '/rides/nearby-drivers';
  static const ridesRoutePreview = '/rides/route-preview';
  static const ridesCreate = '/rides/create';
  static String ride(String id) => '/rides/$id';
  static String rideMessages(String id) => '/rides/$id/messages';
  static const ridesHistory = '/rides/history';
  static const ridesAvailable = '/rides/available';
  static const ridesMyActive = '/rides/my-active';
  static const ridesAccept = '/rides/accept';
  static const ridesRespondProposal = '/rides/respond-proposal';
  static const ridesPassengerMinFare = '/rides/passenger-min-fare';
  static const ridesDriverConfirmBooking = '/rides/driver-confirm-booking';
  static const ridesWithdrawOffer = '/rides/withdraw-offer';
  static const ridesDriverCancel = '/rides/driver-cancel';
  static const ridesStart = '/rides/start';
  static const ridesEnd = '/rides/end';
  static const ridesRate = '/rides/rate';
  static const ridesRatingsReceived = '/rides/ratings/received';

  static const walletAccounts = '/wallet/accounts';
  static const walletDeposit = '/wallet/deposit';
  static const walletWithdrawRequest = '/wallet/withdraw/request';
  static const walletWithdrawConfirm = '/wallet/withdraw/confirm';
  static const walletTransactions = '/wallet/transactions';
  static String walletAccountDelete(String id) => '/wallet/accounts/$id';

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
  static const upload = '/upload';
}
