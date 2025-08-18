import React from 'react';
import { useAuth } from "@/contexts/AuthContext";
import ClientLayout from "@/components/ClientLayout";
import SavedPaymentMethods from "@/components/SavedPaymentMethods";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  User,
  CreditCard,
  Building,
  Mail,
  Phone,
  MapPin,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ClientSettings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

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
            <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
            <p className="text-muted-foreground">
              Manage your profile and payment preferences
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
              Your personal and company details
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
                To update your profile information, please contact your account administrator.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Payment Methods</h2>
          </div>
          
          <SavedPaymentMethods
            onPaymentMethodAdded={handlePaymentMethodAdded}
            onPaymentMethodRemoved={handlePaymentMethodRemoved}
          />
        </div>

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
            For billing inquiries or account changes, please contact your account administrator.
          </p>
        </div>
      </div>
    </ClientLayout>
  );
}
