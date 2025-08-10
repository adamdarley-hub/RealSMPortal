import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    environment: 'test' | 'live';
  };
}

const defaultConfig: ApiConfig = {
  serveManager: {
    baseUrl: 'https://www.servemanager.com/api',
    apiKey: '',
    enabled: false,
    testEndpoint: '/ping',
  },
  radar: {
    publishableKey: '',
    secretKey: '',
    enabled: false,
    environment: 'test',
  },
};

export default function ApiConfig() {
  const [config, setConfig] = useState<ApiConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingServeManager, setTestingServeManager] = useState(false);
  const [testingRadar, setTestingRadar] = useState(false);
  const [showServeManagerKey, setShowServeManagerKey] = useState(false);
  const [showRadarSecret, setShowRadarSecret] = useState(false);
  const [serveManagerStatus, setServeManagerStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [radarStatus, setRadarStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  // Load configuration on component mount
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const data = await response.json();
        setConfig({ ...defaultConfig, ...data });
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
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
    setSaving(true);
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "API configuration saved successfully",
        });
        // Reload the configuration to get the masked keys
        await loadConfiguration();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save API configuration';
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
      const response = await fetch('/api/test-servemanager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl: config.serveManager.baseUrl,
          apiKey: config.serveManager.apiKey,
          testEndpoint: config.serveManager.testEndpoint,
        }),
      });

      if (response.ok) {
        setServeManagerStatus('success');
        toast({
          title: "Success",
          description: "ServeManager API connection successful",
        });
      } else {
        setServeManagerStatus('error');
        toast({
          title: "Error",
          description: "Failed to connect to ServeManager API",
          variant: "destructive",
        });
      }
    } catch (error) {
      setServeManagerStatus('error');
      console.error('ServeManager test failed:', error);
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
      const response = await fetch('/api/test-radar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publishableKey: config.radar.publishableKey,
          environment: config.radar.environment,
        }),
      });

      if (response.ok) {
        setRadarStatus('success');
        toast({
          title: "Success",
          description: "radar.io API connection successful",
        });
      } else {
        setRadarStatus('error');
        toast({
          title: "Error",
          description: "Failed to connect to radar.io API",
          variant: "destructive",
        });
      }
    } catch (error) {
      setRadarStatus('error');
      console.error('Radar test failed:', error);
      toast({
        title: "Error",
        description: "radar.io API test failed",
        variant: "destructive",
      });
    } finally {
      setTestingRadar(false);
    }
  };

  const updateServeManagerConfig = (field: keyof ApiConfig['serveManager'], value: any) => {
    setConfig(prev => ({
      ...prev,
      serveManager: {
        ...prev.serveManager,
        [field]: value,
      },
    }));
    // Reset status when config changes
    if (field === 'apiKey' || field === 'baseUrl') {
      setServeManagerStatus('idle');
    }
  };

  const updateRadarConfig = (field: keyof ApiConfig['radar'], value: any) => {
    setConfig(prev => ({
      ...prev,
      radar: {
        ...prev.radar,
        [field]: value,
      },
    }));
    // Reset status when config changes
    if (field === 'publishableKey' || field === 'secretKey') {
      setRadarStatus('idle');
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
          <Button onClick={saveConfiguration} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </Button>
        </div>

        <Alert>
          <Key className="h-4 w-4" />
          <AlertDescription>
            API keys are securely stored and encrypted. Never share your API keys with unauthorized users.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="servemanager" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="servemanager" className="gap-2">
              <Database className="w-4 h-4" />
              ServeManager API
            </TabsTrigger>
            <TabsTrigger value="radar" className="gap-2">
              <MapPin className="w-4 h-4" />
              radar.io API
            </TabsTrigger>
          </TabsList>

          {/* ServeManager Configuration */}
          <TabsContent value="servemanager" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  ServeManager Integration
                  <Badge variant={config.serveManager.enabled ? "default" : "secondary"}>
                    {config.serveManager.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  {serveManagerStatus === 'success' && (
                    <Badge variant="outline" className="bg-success text-success-foreground">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                  {serveManagerStatus === 'error' && (
                    <Badge variant="outline" className="bg-destructive text-destructive-foreground">
                      <XCircle className="w-3 h-3 mr-1" />
                      Failed
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Configure connection to ServeManager API for job management, client data, and service tracking.
                  <br />
                  <a href="https://www.servemanager.com/api" target="_blank" rel="noopener noreferrer" 
                     className="text-primary hover:underline">
                    View ServeManager API Documentation →
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.serveManager.enabled}
                    onCheckedChange={(checked) => updateServeManagerConfig('enabled', checked)}
                  />
                  <Label htmlFor="servemanager-enabled">Enable ServeManager Integration</Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="servemanager-url">API Base URL</Label>
                    <Input
                      id="servemanager-url"
                      placeholder="https://www.servemanager.com/api"
                      value={config.serveManager.baseUrl}
                      onChange={(e) => updateServeManagerConfig('baseUrl', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="servemanager-test">Test Endpoint</Label>
                    <Input
                      id="servemanager-test"
                      placeholder="/ping"
                      value={config.serveManager.testEndpoint}
                      onChange={(e) => updateServeManagerConfig('testEndpoint', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="servemanager-key">API Key</Label>
                  <div className="relative">
                    <Input
                      id="servemanager-key"
                      type={showServeManagerKey ? "text" : "password"}
                      placeholder="Enter your ServeManager API key"
                      value={config.serveManager.apiKey}
                      onChange={(e) => updateServeManagerConfig('apiKey', e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowServeManagerKey(!showServeManagerKey)}
                    >
                      {showServeManagerKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={testServeManagerConnection} 
                  disabled={testingServeManager || !config.serveManager.apiKey || !config.serveManager.baseUrl}
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
                  <Badge variant={config.radar.enabled ? "default" : "secondary"}>
                    {config.radar.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  {radarStatus === 'success' && (
                    <Badge variant="outline" className="bg-success text-success-foreground">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                  {radarStatus === 'error' && (
                    <Badge variant="outline" className="bg-destructive text-destructive-foreground">
                      <XCircle className="w-3 h-3 mr-1" />
                      Failed
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Configure radar.io for address lookup, geocoding, and location services.
                  <br />
                  <a href="https://radar.io/documentation" target="_blank" rel="noopener noreferrer" 
                     className="text-primary hover:underline">
                    View radar.io API Documentation →
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.radar.enabled}
                    onCheckedChange={(checked) => updateRadarConfig('enabled', checked)}
                  />
                  <Label htmlFor="radar-enabled">Enable radar.io Integration</Label>
                </div>

                <div className="space-y-2">
                  <Label>Environment</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="radar-test"
                        name="radar-environment"
                        checked={config.radar.environment === 'test'}
                        onChange={() => updateRadarConfig('environment', 'test')}
                      />
                      <Label htmlFor="radar-test">Test</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="radar-live"
                        name="radar-environment"
                        checked={config.radar.environment === 'live'}
                        onChange={() => updateRadarConfig('environment', 'live')}
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
                    onChange={(e) => updateRadarConfig('publishableKey', e.target.value)}
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
                      onChange={(e) => updateRadarConfig('secretKey', e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowRadarSecret(!showRadarSecret)}
                    >
                      {showRadarSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
        </Tabs>
      </div>
    </Layout>
  );
}
