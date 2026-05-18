/**
 * Avoid `import { Alert } from "react-native"` — some Hermes/Metro bundles throw
 * ReferenceError: Property 'Alert' doesn't exist when resolving lazy getters on the main export.
 */
const Alert = require("react-native/Libraries/Alert/Alert").default;

export function showAlert(title, message, buttons, options) {
  Alert.alert(title, message, buttons, options);
}
