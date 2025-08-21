import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Key,
  Globe,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  TestTube,
  Save,
  MapPin,
  Database,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApiConfig {
  serveManager: {
    baseUrl: string;
    apiKey: string;
    enabled: boolean;
    testEndpoint: string;
  };
  radar: {
    publishableKey: string;
    secretKey: string;
    enabled: boolean;
    environment: "test" | "live";
  };
  stripe: {
    publishableKey: string;
    secretKey: string;
    enabled: boolean;
    environment: "test" | "live";
    webhookSecret: string;
  };
}

const defaultConfig: ApiConfig = {
  serveManager: {
    baseUrl: "https://www.servemanager.com/api",
    apiKey: "",
    enabled: false,
    testEndpoint: "/account",
  },
  radar: {
    publishableKey: "",
    secretKey: "",
    enabled: false,
    environment: "test",
  },
  stripe: {
    publishableKey: "",
    secretKey: "",
    enabled: false,
    environment: "test",
    webhookSecret: "",
  },
};

export default function ApiConfig() {
  const [config, setConfig] = useState<ApiConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingServeManager, setTestingServeManager] = useState(false);
  const [testingRadar, setTestingRadar] = useState(false);
  const [testingStripe, setTestingStripe] = useState(false);
  const [showServeManagerKey, setShowServeManagerKey] = useState(false);
  const [showRadarSecret, setShowRadarSecret] = useState(false);
  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [serveManagerStatus, setServeManagerStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [radarStatus, setRadarStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [stripeStatus, setStripeStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const { toast } = useToast();

  // Load configuration on component mount
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/config");
      if (response.ok) {
        const data = await response.json();
        setConfig({ ...defaultConfig, ...data });
      }
    } catch (error) {
      console.error("Failed to load configuration:", error);
      toast({
        title: "Error",
        description: "Failed to load API configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    // Basic validation - allow masked keys (starting with ***)
    if (
      config.serveManager.enabled &&
      (!config.serveManager.baseUrl ||
        !config.serveManager.apiKey ||
        (config.serveManager.apiKey === "" && !config.serveManager.apiKey.startsWith("***")))
    ) {
      toast({
        title: "Validation Error",
        description: "Please enter ServeManager API URL and key before saving",
        variant: "destructive",
      });
      return;
    }

    if (
      config.radar.enabled &&
      (!config.radar.publishableKey || config.radar.publishableKey === "")
    ) {
      toast({
        title: "Validation Error",
        description: "Please enter radar.io publishable key before saving",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      // Read the response body once
      let responseData;
      try {
        const responseText = await response.text();
        console.log("Server response status:", response.status);
        console.log("Server response text:", responseText);

        if (responseText) {
          responseData = JSON.parse(responseText);
        } else {
          responseData = { error: "Empty response from server" };
        }
      } catch (parseError) {
        // If JSON parsing fails, log the actual response for debugging
        console.error("Failed to parse server response:", parseError);
        console.error("Response status:", response.status);
        responseData = {
          error: `Invalid response from server (Status: ${response.status})`,
        };
      }

      if (response.ok) {
        toast({
          title: "Success",
          description: "API configuration saved successfully",
        });
        // Reload the configuration to get the masked keys
        await loadConfiguration();
      } else {
        throw new Error(
          responseData.error || `Server error: ${response.status}`,
        );
      }
    } catch (error) {
      console.error("Failed to save configuration:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save API configuration";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testServeManagerConnection = async () => {
    if (!config.serveManager.apiKey || !config.serveManager.baseUrl) {
      toast({
        title: "Error",
        description: "Please enter ServeManager API URL and key first",
        variant: "destructive",
      });
      return;
    }

    setTestingServeManager(true);
    try {
      const response = await fetch("/api/test-servemanager", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseUrl: config.serveManager.baseUrl,
          apiKey: config.serveManager.apiKey,
        }),
      });

      if (response.ok) {
        setServeManagerStatus("success");
        toast({
          title: "Success",
          description: "ServeManager API connection successful",
        });
      } else {
        setServeManagerStatus("error");
        toast({
          title: "Error",
          description: "Failed to connect to ServeManager API",
          variant: "destructive",
        });
      }
    } catch (error) {
      setServeManagerStatus("error");
      console.error("ServeManager test failed:", error);
      toast({
        title: "Error",
        description: "ServeManager API test failed",
        variant: "destructive",
      });
    } finally {
      setTestingServeManager(false);
    }
  };

  const testRadarConnection = async () => {
    if (!config.radar.publishableKey) {
      toast({
        title: "Error",
        description: "Please enter radar.io publishable key first",
        variant: "destructive",
      });
      return;
    }

    setTestingRadar(true);
    try {
      const response = await fetch("/api/test-radar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publishableKey: config.radar.publishableKey,
          environment: config.radar.environment,
        }),
      });

      if (response.ok) {
        setRadarStatus("success");
        toast({
          title: "Success",
          description: "radar.io API connection successful",
        });
      } else {
        setRadarStatus("error");
        toast({
          title: "Error",
          description: "Failed to connect to radar.io API",
          variant: "destructive",
        });
      }
    } catch (error) {
      setRadarStatus("error");
      console.error("Radar test failed:", error);
      toast({
        title: "Error",
        description: "radar.io API test failed",
        variant: "destructive",
      });
    } finally {
      setTestingRadar(false);
    }
  };

  const testStripeConnection = async () => {
    if (!config.stripe.secretKey) {
      toast({
        title: "Error",
        description: "Please enter a Stripe secret key",
        variant: "destructive",
      });
      return;
    }

    setTestingStripe(true);
    try {
      const response = await fetch("/api/test-stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secretKey: config.stripe.secretKey,
          environment: config.stripe.environment,
        }),
      });

      if (response.ok) {
        setStripeStatus("success");
        toast({
          title: "Success",
          description: "Stripe API connection successful",
        });
      } else {
        setStripeStatus("error");
        toast({
          title: "Error",
          description: "Failed to connect to Stripe API",
          variant: "destructive",
        });
      }
    } catch (error) {
      setStripeStatus("error");
      console.error("Stripe test failed:", error);
      toast({
        title: "Error",
        description: "Stripe API test failed",
        variant: "destructive",
      });
    } finally {
      setTestingStripe(false);
    }
  };

  const updateServeManagerConfig = (
    field: keyof ApiConfig["serveManager"],
    value: any,
  ) => {
    setConfig((prev) => ({
      ...prev,
      serveManager: {
        ...prev.serveManager,
        [field]: value,
      },
    }));
    // Reset status when config changes
    if (field === "apiKey" || field === "baseUrl") {
      setServeManagerStatus("idle");
    }
  };

  const updateRadarConfig = (field: keyof ApiConfig["radar"], value: any) => {
    setConfig((prev) => ({
      ...prev,
      radar: {
        ...prev.radar,
        [field]: value,
      },
    }));
    // Reset status when config changes
    if (field === "publishableKey" || field === "secretKey") {
      setRadarStatus("idle");
    }
  };

  const updateStripeConfig = (field: keyof ApiConfig["stripe"], value: any) => {
    setConfig((prev) => ({
      ...prev,
      stripe: {
        ...prev.stripe,
        [field]: value,
      },
    }));
    // Reset status when config changes
    if (field === "publishableKey" || field === "secretKey") {
      setStripeStatus("idle");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Settings className="w-8 h-8" />
              API Configuration
            </h1>
            <p className="text-muted-foreground">
              Configure API integrations for ServeManager and radar.io services
            </p>
          </div>
          <Button
            onClick={saveConfiguration}
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Configuration
          </Button>
        </div>

        <Alert>
          <Key className="h-4 w-4" />
          <AlertDescription>
            API keys are securely stored and encrypted. Never share your API
            keys with unauthorized users.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="servemanager" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="servemanager" className="gap-2">
              <Database className="w-4 h-4" />
              ServeManager API
            </TabsTrigger>
            <TabsTrigger value="radar" className="gap-2">
              <MapPin className="w-4 h-4" />
              radar.io API
            </TabsTrigger>
            <TabsTrigger value="stripe" className="gap-2">
              <Key className="w-4 h-4" />
              Stripe Payments
            </TabsTrigger>
          </TabsList>

          {/* ServeManager Configuration */}
          <TabsContent value="servemanager" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  ServeManager Integration
                  <Badge
                    variant={
                      config.serveManager.enabled ? "default" : "secondary"
                    }
                  >
                    {config.serveManager.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  {serveManagerStatus === "success" && (
                    <Badge
                      variant="outline"
                      className="bg-success text-success-foreground"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                  {serveManagerStatus === "error" && (
                    <Badge
                      variant="outline"
                      className="bg-destructive text-destructive-foreground"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Failed
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Configure connection to ServeManager API for job management,
                  client data, and service tracking.
                  <br />
                  Get your API key from:{" "}
                  <a
                    href="https://www.servemanager.com/api_keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    ServeManager API Keys →
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.serveManager.enabled}
                    onCheckedChange={(checked) =>
                      updateServeManagerConfig("enabled", checked)
                    }
                  />
                  <Label htmlFor="servemanager-enabled">
                    Enable ServeManager Integration
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="servemanager-url">API Base URL</Label>
                  <Input
                    id="servemanager-url"
                    placeholder="https://www.servemanager.com/api"
                    value={config.serveManager.baseUrl}
                    onChange={(e) =>
                      updateServeManagerConfig("baseUrl", e.target.value)
                    }
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the standard ServeManager API URL
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="servemanager-key">API Key</Label>
                  <div className="relative">
                    <Input
                      id="servemanager-key"
                      type={showServeManagerKey ? "text" : "password"}
                      placeholder="sm_api_... (get from ServeManager API Keys page)"
                      value={config.serveManager.apiKey}
                      onChange={(e) =>
                        updateServeManagerConfig("apiKey", e.target.value)
                      }
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() =>
                        setShowServeManagerKey(!showServeManagerKey)
                      }
                    >
                      {showServeManagerKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your API key uses HTTP Basic Authentication. Get it from
                    ServeManager API Keys page.
                  </p>
                </div>

                <Button
                  onClick={testServeManagerConnection}
                  disabled={
                    testingServeManager ||
                    !config.serveManager.apiKey ||
                    !config.serveManager.baseUrl
                  }
                  variant="outline"
                  className="gap-2"
                >
                  {testingServeManager ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  Test Connection
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Radar.io Configuration */}
          <TabsContent value="radar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  radar.io Integration
                  <Badge
                    variant={config.radar.enabled ? "default" : "secondary"}
                  >
                    {config.radar.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  {radarStatus === "success" && (
                    <Badge
                      variant="outline"
                      className="bg-success text-success-foreground"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                  {radarStatus === "error" && (
                    <Badge
                      variant="outline"
                      className="bg-destructive text-destructive-foreground"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Failed
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Configure radar.io for address lookup, geocoding, and location
                  services.
                  <br />
                  <a
                    href="https://radar.io/documentation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View radar.io API Documentation →
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.radar.enabled}
                    onCheckedChange={(checked) =>
                      updateRadarConfig("enabled", checked)
                    }
                  />
                  <Label htmlFor="radar-enabled">
                    Enable radar.io Integration
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label>Environment</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="radar-test"
                        name="radar-environment"
                        checked={config.radar.environment === "test"}
                        onChange={() =>
                          updateRadarConfig("environment", "test")
                        }
                      />
                      <Label htmlFor="radar-test">Test</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="radar-live"
                        name="radar-environment"
                        checked={config.radar.environment === "live"}
                        onChange={() =>
                          updateRadarConfig("environment", "live")
                        }
                      />
                      <Label htmlFor="radar-live">Live</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="radar-publishable">Publishable Key</Label>
                  <Input
                    id="radar-publishable"
                    placeholder="prj_test_pk_..."
                    value={config.radar.publishableKey}
                    onChange={(e) =>
                      updateRadarConfig("publishableKey", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="radar-secret">Secret Key</Label>
                  <div className="relative">
                    <Input
                      id="radar-secret"
                      type={showRadarSecret ? "text" : "password"}
                      placeholder="prj_test_sk_..."
                      value={config.radar.secretKey}
                      onChange={(e) =>
                        updateRadarConfig("secretKey", e.target.value)
                      }
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowRadarSecret(!showRadarSecret)}
                    >
                      {showRadarSecret ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={testRadarConnection}
                  disabled={testingRadar || !config.radar.publishableKey}
                  variant="outline"
                  className="gap-2"
                >
                  {testingRadar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  Test Connection
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stripe Configuration */}
          <TabsContent value="stripe" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Stripe Payment Integration
                  <Badge
                    variant={config.stripe.enabled ? "default" : "secondary"}
                  >
                    {config.stripe.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  {stripeStatus === "success" && (
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                  {stripeStatus === "error" && (
                    <Badge
                      variant="outline"
                      className="bg-red-50 text-red-700 border-red-200"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Error
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Configure your Stripe API keys for payment processing. Use
                  test keys for development and live keys for production.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="stripe-enabled">
                      Enable Stripe Integration
                    </Label>
                    <div className="text-sm text-muted-foreground">
                      Allow payment processing through Stripe
                    </div>
                  </div>
                  <Switch
                    id="stripe-enabled"
                    checked={config.stripe.enabled}
                    onCheckedChange={(checked) =>
                      updateStripeConfig("enabled", checked)
                    }
                  />
                </div>

                {/* Environment Selection */}
                <div className="space-y-2">
                  <Label>Environment</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={
                        config.stripe.environment === "test"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => updateStripeConfig("environment", "test")}
                      className="gap-2"
                    >
                      <TestTube className="w-4 h-4" />
                      Test Mode
                    </Button>
                    <Button
                      variant={
                        config.stripe.environment === "live"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => updateStripeConfig("environment", "live")}
                      className="gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      Live Mode
                    </Button>
                  </div>
                </div>

                {/* Publishable Key */}
                <div className="space-y-2">
                  <Label htmlFor="stripe-publishable-key">
                    Publishable Key
                    <Badge variant="outline" className="ml-2 text-xs">
                      {config.stripe.environment === "test"
                        ? "pk_test_..."
                        : "pk_live_..."}
                    </Badge>
                  </Label>
                  <Input
                    id="stripe-publishable-key"
                    type="text"
                    placeholder={`${config.stripe.environment === "test" ? "pk_test_" : "pk_live_"}...`}
                    value={config.stripe.publishableKey}
                    onChange={(e) =>
                      updateStripeConfig("publishableKey", e.target.value)
                    }
                    className="font-mono text-sm"
                  />
                  <div className="text-xs text-muted-foreground">
                    This key is safe to use in client-side code
                  </div>
                </div>

                {/* Secret Key */}
                <div className="space-y-2">
                  <Label htmlFor="stripe-secret-key">
                    Secret Key
                    <Badge variant="outline" className="ml-2 text-xs">
                      {config.stripe.environment === "test"
                        ? "sk_test_..."
                        : "sk_live_..."}
                    </Badge>
                  </Label>
                  <div className="relative">
                    <Input
                      id="stripe-secret-key"
                      type={showStripeSecret ? "text" : "password"}
                      placeholder={`${config.stripe.environment === "test" ? "sk_test_" : "sk_live_"}...`}
                      value={config.stripe.secretKey}
                      onChange={(e) =>
                        updateStripeConfig("secretKey", e.target.value)
                      }
                      className="font-mono text-sm pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowStripeSecret(!showStripeSecret)}
                    >
                      {showStripeSecret ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Keep this key secure and never expose it in client-side code
                  </div>
                </div>

                {/* Webhook Secret */}
                <div className="space-y-2">
                  <Label htmlFor="stripe-webhook-secret">
                    Webhook Endpoint Secret
                    <Badge variant="outline" className="ml-2 text-xs">
                      whsec_...
                    </Badge>
                  </Label>
                  <Input
                    id="stripe-webhook-secret"
                    type="password"
                    placeholder="whsec_..."
                    value={config.stripe.webhookSecret}
                    onChange={(e) =>
                      updateStripeConfig("webhookSecret", e.target.value)
                    }
                    className="font-mono text-sm"
                  />
                  <div className="text-xs text-muted-foreground">
                    Optional: Used to verify webhook events from Stripe
                  </div>
                </div>

                {/* Test Connection */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Test your Stripe connection to ensure the keys are valid
                  </div>
                  <Button
                    onClick={testStripeConnection}
                    disabled={testingStripe || !config.stripe.secretKey}
                    variant="outline"
                    className="gap-2"
                  >
                    {testingStripe ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <TestTube className="w-4 h-4" />
                    )}
                    Test Connection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
