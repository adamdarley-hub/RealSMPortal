import PlaceholderPage from "./PlaceholderPage";
import { CreditCard } from "lucide-react";

export default function Invoices() {
  return (
    <PlaceholderPage
      title="Invoice & Payment Management"
      description="Automatic invoice creation, Stripe payment integration, and comprehensive billing tracking for all service requests."
      icon={CreditCard}
    />
  );
}
