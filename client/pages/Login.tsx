import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  // Don't clear logout flag automatically - only clear it on successful login

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const success = await login(email, password);
    if (success) {
      navigate("/");
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2Fa0b2fe3b0e09431caaa97bd8f93a665d%2F139db428d22d4a54820d95b38550cbce?format=webp&width=300"
            alt="Allegiance Legal Solutions"
            className="h-12 w-auto mx-auto mb-4"
          />
          <CardDescription>
            Access your process service management portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground text-center mb-3">
              Demo Access:
            </p>
            <div className="space-y-2 text-xs">
              <div className="bg-muted p-2 rounded">
                <strong>Admin:</strong> admin@serveportal.com
                <br />
                <strong>Password:</strong> password
              </div>
              <div className="bg-blue-50 p-2 rounded border border-blue-200">
                <strong>Any Client:</strong> Use any client email from database
                <br />
                <strong>Examples:</strong> service@wyattprocess.com,
                kelly@kerrcivilprocess.com
                <br />
                <strong>Password:</strong> password
              </div>
              <div className="bg-yellow-50 p-2 rounded border border-yellow-200 text-xs">
                <strong>Note:</strong> All accounts use "password" for
                development. Clients can set custom passwords later.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
