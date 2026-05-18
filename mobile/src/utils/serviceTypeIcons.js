/** MaterialCommunityIcons name for each service type key */
export function getServiceIconName(typeKey) {
  switch (String(typeKey || "").toLowerCase()) {
    case "shipping":
      return "truck-delivery-outline";
    case "delivery":
      return "package-variant";
    case "travel":
      return "car-estate";
    case "motorcycle":
      return "motorbike";
    case "car_standard":
      return "car-outline";
    case "car_comfort":
      return "car-sports";
    case "xl":
      return "van-passenger";
    case "premium":
      return "car-sports";
    case "economy":
    default:
      return "car-outline";
  }
}
