import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";
import { Button } from "./button";
import { Loader2, Menu, X } from "lucide-react";
import { Avatar, AvatarFallback } from "./avatar";

export default function Header() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Maps", path: "/maps" },
    { name: "Alerts", path: "/alerts" },
    { name: "Settings", path: "/settings" },
  ];

  return (
    <header className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 shadow-lg z-10 sticky top-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <div className="flex items-center">
                <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="rgba(255,255,255,0.1)"/>
                  <path 
                    d="M6.5 12C8.5 8 9.5 7 12 7C14.5 7 15.5 8 17.5 12C15.5 16 14.5 17 12 17C9.5 17 8.5 16 6.5 12Z" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    fill="rgba(255,255,255,0.2)"
                  />
                  <path 
                    d="M12 12C12 14 12 16 12 17.5" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round"
                  />
                  <path 
                    d="M12 7C12 8.5 12 10 12 12" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round"
                  />
                </svg>
                <Link href="/dashboard">
                  <span className="ml-2 text-xl font-bold cursor-pointer bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100">
                    <span className="font-normal">Flood</span>Guard
                  </span>
                </Link>
              </div>
            </div>
            <nav className="hidden md:ml-8 md:flex md:items-center">
              <div className="flex space-x-1">
                {navItems.map((item) => (
                  <Link key={item.path} href={item.path}>
                    <span
                      className={`${
                        location === item.path
                          ? "bg-blue-800 text-white"
                          : "text-white hover:bg-blue-700/80 hover:text-white"
                      } px-4 py-2 rounded-md text-sm font-medium cursor-pointer inline-flex items-center transition-colors duration-200`}
                      aria-current={location === item.path ? "page" : undefined}
                    >
                      {item.name}
                    </span>
                  </Link>
                ))}
              </div>
            </nav>
          </div>
          
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-gray-300 shadow-sm px-4 py-2 bg-white text-sm text-gray-700 hover:bg-gray-50">
                    {user?.firstName || user?.username}
                    <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <div className="flex items-center">
                      <Avatar className="mr-2 h-8 w-8">
                        <AvatarFallback>{getInitials(user?.firstName || user?.username || "")}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{user?.firstName} {user?.lastName}</div>
                        <div className="text-xs text-gray-500">{user?.email}</div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/settings">
                      <span className="w-full">Profile Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    {logoutMutation.isPending ? (
                      <div className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging out...
                      </div>
                    ) : (
                      "Logout"
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="-mr-2 flex md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${mobileMenuOpen ? "block" : "hidden"} md:hidden bg-blue-700`} id="mobile-menu">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <span
                className={`${
                  location === item.path
                    ? "bg-blue-800 text-white"
                    : "text-white hover:bg-blue-600 hover:text-white"
                } block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}
                aria-current={location === item.path ? "page" : undefined}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </span>
            </Link>
          ))}
        </div>
        <div className="pt-4 pb-3 border-t border-blue-600">
          <div className="flex items-center px-5">
            <div className="flex-shrink-0">
              <Avatar>
                <AvatarFallback>{getInitials(user?.firstName || user?.username || "")}</AvatarFallback>
              </Avatar>
            </div>
            <div className="ml-3">
              <div className="text-base font-medium text-white">{user?.firstName} {user?.lastName}</div>
              <div className="text-sm font-medium text-white opacity-80">{user?.email}</div>
            </div>
          </div>
          <div className="mt-3 px-2 space-y-1">
            <button
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-600"
            >
              {logoutMutation.isPending ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging out...
                </div>
              ) : (
                "Logout"
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}