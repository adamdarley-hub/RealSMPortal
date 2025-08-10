import PlaceholderPage from "./PlaceholderPage";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <PlaceholderPage
      title="System Settings"
      description="Process server management, API configuration, pricing management, and comprehensive system administration."
      icon={SettingsIcon}
    />
  );
}
