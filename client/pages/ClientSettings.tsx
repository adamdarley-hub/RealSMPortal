import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ClientLayout from "@/components/ClientLayout";
import SavedPaymentMethods from "@/components/SavedPaymentMethods";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  User,
  CreditCard,
  Building,
  Mail,
  Phone,
  MapPin,
  Save,
  Shield,
  Bell,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ClientSettings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  // Contact info state
  const [contactInfo, setContactInfo] = useState({
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Notification preferences
  const [notifications, setNotifications] = useState({
    jobUpdates: true,
    invoiceAlerts: true,
    emailNotifications: true,
    smsNotifications: false
  });

  // Load user contact info on mount
  useEffect(() => {
    if (user) {
      setContactInfo({
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        zip: user.zip || ''
      });
    }
  }, [user]);

  const handleContactInfoChange = (field: string, value: string) => {
    setContactInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNotificationChange = (field: string, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveContactInfo = async () => {
    if (!user?.client_id) {
      toast({
        title: "Error",
        description: "Unable to update contact information. Client ID not found.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Update ServeManager
      const response = await fetch('/api/servemanager/clients/' + user.client_id, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: contactInfo.phone,
          address: contactInfo.address,
          city: contactInfo.city,
          state: contactInfo.state,
          zip: contactInfo.zip
        })
      });

      if (response.ok) {
        toast({
          title: "Contact Information Updated",
          description: "Your contact information has been successfully updated in ServeManager.",
        });
      } else {
        throw new Error('Failed to update ServeManager');
      }
    } catch (error) {
      console.error('Error updating contact info:', error);
      toast({
        title: "Update Failed",
        description: "There was an error updating your contact information. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveNotificationPreferences = () => {
    // Save notification preferences to local storage or backend
    localStorage.setItem('notificationPreferences', JSON.stringify(notifications));
    toast({
      title: "Preferences Saved",
      description: "Your notification preferences have been updated.",
    });
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  const handlePaymentMethodAdded = () => {
    toast({
      title: "Payment Method Added",
      description: "Your payment method has been saved and is ready for use.",
    });
  };

  const handlePaymentMethodRemoved = () => {
    toast({
      title: "Payment Method Removed",
      description: "The payment method has been successfully removed.",
    });
  };

  return (
    <ClientLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings & Profile</h1>
            <p className="text-muted-foreground">
              Manage your account information, contact details, and preferences
            </p>
          </div>
        </div>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Account Information
            </CardTitle>
            <CardDescription>
              Your account details and company information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={user?.name || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Verified
                  </Badge>
                </div>
              </div>
              
              {user?.company && (
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <Input
                      id="company"
                      value={user.company}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
              )}
              
              {user?.client_id && (
                <div className="space-y-2">
                  <Label htmlFor="client-id">Client ID</Label>
                  <Input
                    id="client-id"
                    value={user.client_id}
                    disabled
                    className="bg-muted"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-blue-600">
                <User className="w-5 h-5" />
              </div>
              <div className="text-sm text-blue-800">
                <strong>Account Type:</strong> Client Portal Access
                <br />
                Email address and company information cannot be changed. Contact your account administrator for these updates.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information - Editable */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Contact Information
            </CardTitle>
            <CardDescription>
              Update your contact details. Changes will be synced with ServeManager.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={contactInfo.phone}
                    onChange={(e) => handleContactInfoChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="address"
                    value={contactInfo.address}
                    onChange={(e) => handleContactInfoChange('address', e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={contactInfo.city}
                  onChange={(e) => handleContactInfoChange('city', e.target.value)}
                  placeholder="New York"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={contactInfo.state}
                  onChange={(e) => handleContactInfoChange('state', e.target.value)}
                  placeholder="NY"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  value={contactInfo.zip}
                  onChange={(e) => handleContactInfoChange('zip', e.target.value)}
                  placeholder="10001"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveContactInfo} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Contact Info
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose how you want to be notified about job updates and account activities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="job-updates">Job Status Updates</Label>
                  <p className="text-sm text-muted-foreground">Get notified when job status changes</p>
                </div>
                <Switch
                  id="job-updates"
                  checked={notifications.jobUpdates}
                  onCheckedChange={(checked) => handleNotificationChange('jobUpdates', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="invoice-alerts">Invoice & Payment Alerts</Label>
                  <p className="text-sm text-muted-foreground">Notifications about invoices and payments</p>
                </div>
                <Switch
                  id="invoice-alerts"
                  checked={notifications.invoiceAlerts}
                  onCheckedChange={(checked) => handleNotificationChange('invoiceAlerts', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) => handleNotificationChange('emailNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms-notifications">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive urgent notifications via SMS</p>
                </div>
                <Switch
                  id="sms-notifications"
                  checked={notifications.smsNotifications}
                  onCheckedChange={(checked) => handleNotificationChange('smsNotifications', checked)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveNotificationPreferences}>
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>
              Manage your saved payment methods for invoice payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SavedPaymentMethods
              onPaymentMethodAdded={handlePaymentMethodAdded}
              onPaymentMethodRemoved={handlePaymentMethodRemoved}
            />
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security
            </CardTitle>
            <CardDescription>
              Manage your account security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Change Password</h3>
                <p className="text-sm text-muted-foreground">
                  Update your account password
                </p>
              </div>
              <Button variant="outline">
                Change Password
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Two-Factor Authentication</h3>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Button variant="outline">
                Setup 2FA
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Account Actions</CardTitle>
            <CardDescription>
              Manage your account session and access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Sign Out</h3>
                <p className="text-sm text-muted-foreground">
                  Sign out of your account on this device
                </p>
              </div>
              <Button onClick={handleLogout} variant="outline">
                Sign Out
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Need Help?</h3>
                <p className="text-sm text-muted-foreground">
                  Contact support for account assistance
                </p>
              </div>
              <Button variant="outline" asChild>
                <a href="mailto:support@serveportal.com">
                  Contact Support
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            For billing inquiries or changes to email/company information, please contact your account administrator.
          </p>
        </div>
      </div>
    </ClientLayout>
  );
}
