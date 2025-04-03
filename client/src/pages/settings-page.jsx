import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Header from '@/components/ui/header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const profileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Please enter a valid email address"),
  receiveAlerts: z.boolean().default(true),
});

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [formSuccess, setFormSuccess] = useState(false);
  
  // Form setup
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      receiveAlerts: user?.receiveAlerts ?? true,
    },
  });
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiRequest("PATCH", "/api/settings", data);
      return await res.json();
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Settings updated",
        description: "Your profile settings have been saved successfully.",
      });
      setFormSuccess(true);
      setTimeout(() => setFormSuccess(false), 3000);
      
      // Update the user data in the cache
      queryClient.setQueryData(["/api/user"], updatedUser);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          </div>
          
          <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 mt-4">
            {formSuccess && (
              <Alert className="mb-6" variant="default">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  Your settings have been updated successfully.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Profile Settings */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>
                  Update your personal information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email address</FormLabel>
                          <FormControl>
                            <Input placeholder="john.doe@example.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            This email will be used for flood alerts and account notifications.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="receiveAlerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Email Notifications</FormLabel>
                            <FormDescription>
                              Receive email alerts when flood risk is medium or high in your area.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full sm:w-auto"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
            
            {/* Location Settings */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Location Settings</CardTitle>
                <CardDescription>
                  Configure how FloodGuard uses your location data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="location-tracking" className="text-base">Location Tracking</Label>
                    <p className="text-sm text-gray-500">Allow FloodGuard to access your location in the background</p>
                  </div>
                  <Switch id="location-tracking" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="location-sharing" className="text-base">Location Sharing</Label>
                    <p className="text-sm text-gray-500">Share your location with emergency services during high-risk events</p>
                  </div>
                  <Switch id="location-sharing" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="location-precision" className="text-base">High Precision</Label>
                    <p className="text-sm text-gray-500">Use GPS for more accurate location tracking (increases battery usage)</p>
                  </div>
                  <Switch id="location-precision" />
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline">Save Location Settings</Button>
              </CardFooter>
            </Card>
            
            {/* Account Settings */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your FloodGuard account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" className="mt-1" />
                </div>
                
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" className="mt-1" />
                </div>
                
                <div>
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" type="password" className="mt-1" />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2 sm:flex-row sm:justify-between sm:space-y-0">
                <Button variant="outline">Change Password</Button>
                <Button variant="destructive">Delete Account</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}