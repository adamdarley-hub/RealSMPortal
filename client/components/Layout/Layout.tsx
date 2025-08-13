import React, { Suspense } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  FileText,
  Home,
  Users,
  BarChart3,
  Settings,
  DollarSign,
  FolderOpen,
} from "lucide-react";

// Lazy load non-critical icons
const CriticalIcons = {
  FileText,
  Home,
  Users,
  BarChart3,
  Settings,
  DollarSign,
  FolderOpen,
};

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: CriticalIcons.Home },
  { name: "Jobs", href: "/jobs", icon: CriticalIcons.FileText },
  { name: "Clients", href: "/clients", icon: CriticalIcons.Users },
  { name: "Documents", href: "/documents", icon: CriticalIcons.FolderOpen },
  { name: "Invoices", href: "/invoices", icon: CriticalIcons.DollarSign },
  { name: "Analytics", href: "/analytics", icon: CriticalIcons.BarChart3 },
  { name: "Settings", href: "/settings", icon: CriticalIcons.Settings },
];

// Memoized navigation item component
const NavigationItem = React.memo(({ item, isActive }: { item: typeof navigation[0]; isActive: boolean }) => {
  const Icon = item.icon;
  
  return (
    <Link
      to={item.href}
      className={cn(
        "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-150",
          isActive
            ? "text-primary-foreground"
            : "text-muted-foreground group-hover:text-foreground"
        )}
        aria-hidden="true"
      />
      {item.name}
    </Link>
  );
});

NavigationItem.displayName = "NavigationItem";

// Memoized sidebar component
const Sidebar = React.memo(({ currentPath }: { currentPath: string }) => {
  return (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-card border-r">
        <div className="flex items-center flex-shrink-0 px-4">
          <FileText className="h-8 w-8 text-primary" />
          <span className="ml-2 text-xl font-bold text-foreground">
            ServeManager
          </span>
        </div>
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => (
            <NavigationItem
              key={item.name}
              item={item}
              isActive={currentPath === item.href}
            />
          ))}
        </nav>
      </div>
    </div>
  );
});

Sidebar.displayName = "Sidebar";

// Main layout component with performance optimizations
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <Sidebar currentPath={location.pathname} />
      
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Mobile sidebar would go here if needed */}
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          }>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default Layout;
