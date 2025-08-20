import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Menu,
  FileText,
  CreditCard,
  User,
  LogOut,
  Building,
  Settings
} from "lucide-react";

const navigation = [
  { name: "My Jobs", href: "/client", icon: FileText },
  { name: "Invoices", href: "/client/invoices", icon: CreditCard },
  { name: "Settings", href: "/client/settings", icon: Settings },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-6">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Fa0b2fe3b0e09431caaa97bd8f93a665d%2F139db428d22d4a54820d95b38550cbce?format=webp&width=200"
              alt="Allegiance Legal Solutions"
              className="h-8 w-auto"
            />
            <Badge variant="secondary" className="ml-2">
              Client
            </Badge>
          </div>
          <div className="mt-6 flex flex-col flex-grow">
            <nav className="flex-1 px-4 space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Mobile sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <div className="p-6 border-b">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets%2Fa0b2fe3b0e09431caaa97bd8f93a665d%2F139db428d22d4a54820d95b38550cbce?format=webp&width=200"
                  alt="Allegiance Legal Solutions"
                  className="h-6 w-auto mb-2"
                />
                <Badge variant="secondary" className="mt-1">
                  Client Portal
                </Badge>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-2">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </SheetContent>

          {/* Top bar */}
          <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow border-b border-gray-200">
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden px-4 border-r border-gray-200"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>

            <div className="flex-1 px-4 flex justify-between items-center">
              <div className="flex-1" />
              
              {/* User info */}
              <div className="ml-4 flex items-center space-x-4">
                <div className="flex flex-col text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {user?.name}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center">
                    <Building className="h-3 w-3 mr-1" />
                    {user?.company}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1">
            {children}
          </main>
        </Sheet>
      </div>
    </div>
  );
}
