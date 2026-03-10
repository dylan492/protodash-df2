"use client";

import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Users, Building2, Shield, Key } from "lucide-react";
import { CustodianAccessDialog } from "@/components/access/CustodianAccessDialog";

interface CustodianAccess {
  id: string;
  custodian: string;
  person_name: string;
  person_role: string | null;
  access_level: string;
}

const ACCESS_LEVEL_COLORS = {
  read: "bg-muted text-muted-foreground border-border",
  transact: "bg-accent/10 text-accent border-accent/20",
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  two_touch: "bg-warning/10 text-warning border-warning/20",
};

const ACCESS_LEVEL_DESCRIPTIONS = {
  read: "View only access",
  transact: "Can initiate transactions",
  admin: "Full control and management",
  two_touch: "Requires dual approval",
};

const APP_ROLES = {
  viewer: {
    title: "Viewer",
    description: "Read-only access to all data",
    permissions: ["View assets and holdings", "View trading history", "View events", "View access directory"],
    color: "bg-muted text-muted-foreground",
  },
  editor: {
    title: "Editor",
    description: "Can modify data but not manage access",
    permissions: [
      "All Viewer permissions",
      "Edit holdings",
      "Manage trading instructions",
      "Manage events",
      "Record transactions",
    ],
    color: "bg-accent/10 text-accent",
  },
  admin: {
    title: "Admin",
    description: "Full system access",
    permissions: [
      "All Editor permissions",
      "Manage user access",
      "Manage custodian access",
      "Configure system settings",
      "View audit logs",
    ],
    color: "bg-primary/10 text-primary",
  },
};

export default function AccessPage() {
  const supabase = createClient();

  // Fetch custodian access data
  const { data: accessData, isLoading: accessLoading } = useQuery({
    queryKey: ["custodian_access"],
    queryFn: async () => {
      const { data } = await supabase
        .from("custodian_access")
        .select("*")
        .order("custodian")
        .order("person_name");
      return data as CustodianAccess[];
    },
  });

  // Group by custodian
  const accessByCustodian = useMemo(() => {
    if (!accessData) return {};
    return accessData.reduce((acc, item) => {
      if (!acc[item.custodian]) {
        acc[item.custodian] = [];
      }
      acc[item.custodian].push(item);
      return acc;
    }, {} as Record<string, CustodianAccess[]>);
  }, [accessData]);

  // Group by person
  const accessByPerson = useMemo(() => {
    if (!accessData) return {};
    return accessData.reduce((acc, item) => {
      if (!acc[item.person_name]) {
        acc[item.person_name] = [];
      }
      acc[item.person_name].push(item);
      return acc;
    }, {} as Record<string, CustodianAccess[]>);
  }, [accessData]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!accessData) {
      return {
        totalUsers: 0,
        totalCustodians: 0,
        adminAccess: 0,
        twoTouchAccess: 0,
      };
    }

    return {
      totalUsers: Object.keys(accessByPerson).length,
      totalCustodians: Object.keys(accessByCustodian).length,
      adminAccess: accessData.filter((a) => a.access_level === "admin").length,
      twoTouchAccess: accessData.filter((a) => a.access_level === "two_touch").length,
    };
  }, [accessData, accessByPerson, accessByCustodian]);

  const AccessLevelBadge = ({ level }: { level: string }) => {
    const colorClass = ACCESS_LEVEL_COLORS[level as keyof typeof ACCESS_LEVEL_COLORS] || "";
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}
      >
        {level}
      </span>
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Access Management</h1>
            <p className="text-muted-foreground">
              Manage custodian access and application roles
            </p>
          </div>
          <CustodianAccessDialog />
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {accessLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{kpis.totalUsers}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unique individuals
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custodians</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {accessLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{kpis.totalCustodians}</div>
                  <p className="text-xs text-muted-foreground mt-1">Active custodians</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Access</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {accessLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{kpis.adminAccess}</div>
                  <p className="text-xs text-muted-foreground mt-1">Admin privileges</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Two-Touch</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {accessLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{kpis.twoTouchAccess}</div>
                  <p className="text-xs text-muted-foreground mt-1">Dual approval</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="custodian" className="space-y-4">
          <TabsList>
            <TabsTrigger value="custodian">By Custodian</TabsTrigger>
            <TabsTrigger value="person">By Person</TabsTrigger>
            <TabsTrigger value="rbac">App RBAC</TabsTrigger>
          </TabsList>

          {/* By Custodian View */}
          <TabsContent value="custodian">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accessLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-40" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                Object.entries(accessByCustodian).map(([custodian, people]) => (
                  <Card key={custodian}>
                    <CardHeader>
                      <CardTitle className="text-lg">{custodian}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {people.length} {people.length === 1 ? "person" : "people"} with
                        access
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {people.map((person) => (
                          <div
                            key={person.id}
                            className="flex items-center justify-between group"
                          >
                            <div>
                              <div className="font-medium">{person.person_name}</div>
                              {person.person_role && (
                                <div className="text-xs text-muted-foreground">
                                  {person.person_role}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <AccessLevelBadge level={person.access_level} />
                              <CustodianAccessDialog
                                access={person}
                                trigger={
                                  <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* By Person View */}
          <TabsContent value="person">
            <Card>
              <CardHeader>
                <CardTitle>People Directory</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Person</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Custodian Access</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Skeleton className="h-4 w-32" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-48" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      Object.entries(accessByPerson).map(([person, accesses]) => {
                        const personRole =
                          accesses[0].person_role || "Team Member";
                        return (
                          <TableRow key={person}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(person)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{person}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {personRole}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {accesses.map((access) => (
                                  <div
                                    key={access.id}
                                    className="inline-flex items-center gap-1"
                                  >
                                    <span className="text-sm">
                                      {access.custodian}
                                    </span>
                                    <AccessLevelBadge level={access.access_level} />
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* App RBAC View */}
          <TabsContent value="rbac">
            <div className="space-y-6">
              {/* Role Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                {Object.entries(APP_ROLES).map(([key, role]) => (
                  <Card key={key}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{role.title}</CardTitle>
                        <Badge className={role.color}>{key}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {role.description}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {role.permissions.map((permission, idx) => (
                          <li
                            key={idx}
                            className="text-sm flex items-start gap-2"
                          >
                            <span className="text-primary mt-1">•</span>
                            <span>{permission}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Custodian Access Level Legend */}
              <Card>
                <CardHeader>
                  <CardTitle>Custodian Access Level Legend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(ACCESS_LEVEL_DESCRIPTIONS).map(([level, description]) => (
                      <div key={level} className="space-y-2">
                        <AccessLevelBadge level={level} />
                        <p className="text-sm text-muted-foreground">
                          {description}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
