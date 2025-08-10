import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Settings as SettingsIcon,
  Key,
  Users,
  DollarSign,
  Server,
  ChevronRight,
  Database,
  MapPin
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Settings() {
  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="w-8 h-8" />
            System Settings
          </h1>
          <p className="text-muted-foreground">
            Manage system configuration, integrations, and administrative settings
          </p>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* API Configuration */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                API Configuration
              </CardTitle>
              <CardDescription>
                Configure ServeManager and radar.io API integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Database className="w-4 h-4" />
                  ServeManager API
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  radar.io Integration
                </div>
                <Button asChild variant="outline" className="w-full gap-2">
                  <Link to="/api-config">
                    Configure APIs
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Process Server Management */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Process Servers
              </CardTitle>
              <CardDescription>
                Manage process server profiles and assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Coming soon...
                </div>
                <Button variant="outline" className="w-full" disabled>
                  Manage Servers
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Management */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Pricing Management
              </CardTitle>
              <CardDescription>
                Configure service fees and pricing tiers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Coming soon...
                </div>
                <Button variant="outline" className="w-full" disabled>
                  Manage Pricing
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Configuration */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                System Configuration
              </CardTitle>
              <CardDescription>
                General system settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Coming soon...
                </div>
                <Button variant="outline" className="w-full" disabled>
                  System Settings
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </Layout>
  );
}
