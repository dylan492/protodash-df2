"use client";

import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Database, Users, Shield, RefreshCw } from "lucide-react";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export default function SettingsPage() {
  const supabase = createClient();

  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ["user_roles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });
      return data as UserRole[];
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current_user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: currentUserRole } = useQuery({
    queryKey: ["current_user_role", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const { data } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", currentUser.id)
        .single();
      return data as UserRole;
    },
    enabled: !!currentUser,
  });

  const isAdmin = currentUserRole?.role === "admin";

  return (
    <PageLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Account and application configuration</p>
        </div>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your current session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email</Label>
                <p className="text-sm text-muted-foreground mt-1">{currentUser?.email || "Loading..."}</p>
              </div>
              <Badge variant="outline">{currentUserRole?.role || "viewer"}</Badge>
            </div>
            <Separator />
            <div>
              <Label>User ID</Label>
              <p className="text-sm text-muted-foreground mt-1 mono">{currentUser?.id || "Loading..."}</p>
            </div>
          </CardContent>
        </Card>

        {/* Database Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Database</CardTitle>
                <CardDescription>Supabase connection details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Status</Label>
              <Badge className="bg-success/10 text-success border-success/20">Connected</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label>Schema Version</Label>
              <Badge variant="outline">v3.0</Badge>
            </div>
            <Separator />
            <div>
              <Label>Project</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "").split(".")[0] || "Not configured"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Upcoming Features</CardTitle>
                <CardDescription>In progress</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Live custodian API sync", desc: "Pull real balances from BitGo, Coinbase, Fireblocks, MetaMask, Petra, Pelagus" },
              { label: "NetSuite reconciliation", desc: "Auto-compare custodian data vs NetSuite bookings" },
              { label: "Audit logging", desc: "Track all user edits with timestamps" },
              { label: "Jira auto-sync", desc: "Automatic ticket status synchronization" },
            ].map((item, i) => (
              <div key={i}>
                {i > 0 && <Separator className="mb-4" />}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{item.label}</Label>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* User Management — admin only */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Admin only</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rolesLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">Loading...</TableCell>
                    </TableRow>
                  ) : userRoles?.length ? (
                    userRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="mono text-xs">{role.user_id.slice(0, 8)}...</TableCell>
                        <TableCell><Badge variant="outline">{role.role}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(role.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" disabled>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">No users found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-4 flex gap-2">
                <Button disabled><Users className="h-4 w-4 mr-2" />Invite User</Button>
                <Button variant="outline" disabled><Shield className="h-4 w-4 mr-2" />Manage Roles</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
