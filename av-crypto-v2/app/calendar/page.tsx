"use client";

import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { JiraLink } from "@/components/shared/JiraLink";
import { EventDialog } from "@/components/events/EventDialog";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Gift,
  Unlock,
  TrendingUp,
  Users,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";

interface Asset {
  id: string;
  symbol: string;
  name: string;
}

interface Event {
  id: string;
  asset_id: string | null;
  title: string;
  event_type: string;
  event_date: string;
  status: string;
  description: string | null;
  jira_ticket_id: string | null;
  assets?: Asset;
}

const EVENT_TYPE_ICONS = {
  drop: Gift,
  unlock: Unlock,
  planned_trade: TrendingUp,
  rec: Users,
};

const EVENT_TYPE_COLORS = {
  drop: "bg-success/10 text-success border-success/20",
  unlock: "bg-primary/10 text-primary border-primary/20",
  planned_trade: "bg-accent/10 text-accent border-accent/20",
  rec: "bg-secondary text-muted-foreground border-border",
};

export default function EventsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Fetch all events with asset info
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["events_all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*, assets(id, symbol, name)")
        .order("event_date", { ascending: false });
      return data as any[];
    },
  });

  // Mutation to toggle event status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase
        .from("events")
        .update({ status: newStatus } as unknown as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events_all"] });
    },
  });

  // Split events by status
  const { pendingEvents, completedEvents } = useMemo(() => {
    if (!events) return { pendingEvents: [], completedEvents: [] };
    return {
      pendingEvents: events.filter((e) => e.status === "pending"),
      completedEvents: events.filter((e) => e.status === "complete"),
    };
  }, [events]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!pendingEvents) {
      return {
        upcomingDrops: 0,
        upcomingUnlocks: 0,
        plannedTrades: 0,
        recMeetings: 0,
        totalPending: 0,
      };
    }

    return {
      upcomingDrops: pendingEvents.filter((e) => e.event_type === "drop").length,
      upcomingUnlocks: pendingEvents.filter((e) => e.event_type === "unlock").length,
      plannedTrades: pendingEvents.filter((e) => e.event_type === "planned_trade")
        .length,
      recMeetings: pendingEvents.filter((e) => e.event_type === "rec").length,
      totalPending: pendingEvents.length,
    };
  }, [pendingEvents]);

  // Get events for calendar view
  const calendarEvents = useMemo(() => {
    if (!events) return [];
    return events.filter((e) => isSameMonth(new Date(e.event_date), selectedMonth));
  }, [events, selectedMonth]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    return eachDayOfInterval({ start, end });
  }, [selectedMonth]);

  const handleToggleStatus = (event: Event) => {
    const newStatus = event.status === "pending" ? "complete" : "pending";
    toggleStatusMutation.mutate({ id: event.id, newStatus });
  };

  const EventTypeIcon = ({ type }: { type: string }) => {
    const Icon = EVENT_TYPE_ICONS[type as keyof typeof EVENT_TYPE_ICONS] || CalendarIcon;
    return <Icon className="h-4 w-4" />;
  };

  const EventTypeBadge = ({ type }: { type: string }) => {
    const colorClass = EVENT_TYPE_COLORS[type as keyof typeof EVENT_TYPE_COLORS] || "";
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}
      >
        <EventTypeIcon type={type} />
        {type}
      </span>
    );
  };

  const EventRow = ({ event, showCheckbox = false }: { event: Event; showCheckbox?: boolean }) => (
    <div
      className={`flex items-start gap-4 p-4 rounded-lg border ${
        event.status === "complete" ? "opacity-60 bg-muted/20" : "bg-card"
      } group`}
    >
      {showCheckbox && (
        <Checkbox
          checked={event.status === "complete"}
          onCheckedChange={() => handleToggleStatus(event)}
          className="mt-1"
        />
      )}
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <EventTypeBadge type={event.event_type} />
            {event.assets && (
              <Badge variant="outline">{event.assets.symbol}</Badge>
            )}
            <span
              className={`font-medium ${
                event.status === "complete" ? "line-through" : ""
              }`}
            >
              {event.title}
            </span>
            <StatusBadge status={event.status} />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-muted-foreground mono">{formatDate(event.event_date)}</span>
            {event.jira_ticket_id && <JiraLink ticketId={event.jira_ticket_id} />}
            <EventDialog
              event={event}
              trigger={
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="h-3 w-3" />
                </Button>
              }
            />
          </div>
        </div>
        {event.description && (
          <p className="text-sm text-muted-foreground">{event.description}</p>
        )}
      </div>
    </div>
  );

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Events Calendar</h1>
            <p className="text-muted-foreground">
              Track drops, unlocks, planned trades, and REC meetings
            </p>
          </div>
          <EventDialog />
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Drops</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{kpis.upcomingDrops}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Airdrops & rewards
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Unlocks</CardTitle>
              <Unlock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{kpis.upcomingUnlocks}</div>
                  <p className="text-xs text-muted-foreground mt-1">Token unlocks</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Planned Trades</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{kpis.plannedTrades}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Scheduled trades
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">REC Meetings</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{kpis.recMeetings}</div>
                  <p className="text-xs text-muted-foreground mt-1">Committee reviews</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{kpis.totalPending}</div>
                  <p className="text-xs text-muted-foreground mt-1">All pending</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>

          {/* List View */}
          <TabsContent value="list" className="space-y-4">
            {/* Pending Events */}
            <Card>
              <CardHeader>
                <CardTitle>Pending Events ({pendingEvents?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-24" />
                    ))}
                  </div>
                ) : pendingEvents && pendingEvents.length > 0 ? (
                  <div className="space-y-3">
                    {pendingEvents.map((event) => (
                      <EventRow key={event.id} event={event} showCheckbox={true} />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No pending events
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Completed Events */}
            <Card>
              <CardHeader>
                <CardTitle>Completed Events ({completedEvents?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-24" />
                    ))}
                  </div>
                ) : completedEvents && completedEvents.length > 0 ? (
                  <div className="space-y-3">
                    {completedEvents.map((event) => (
                      <EventRow key={event.id} event={event} showCheckbox={true} />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No completed events
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar View */}
          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{format(selectedMonth, "MMMM yyyy")}</CardTitle>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setSelectedMonth(
                          new Date(
                            selectedMonth.getFullYear(),
                            selectedMonth.getMonth() - 1
                          )
                        )
                      }
                      className="px-3 py-1 text-sm rounded-md hover:bg-muted"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setSelectedMonth(new Date())}
                      className="px-3 py-1 text-sm rounded-md hover:bg-muted"
                    >
                      Today
                    </button>
                    <button
                      onClick={() =>
                        setSelectedMonth(
                          new Date(
                            selectedMonth.getFullYear(),
                            selectedMonth.getMonth() + 1
                          )
                        )
                      }
                      className="px-3 py-1 text-sm rounded-md hover:bg-muted"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {/* Day headers */}
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div
                      key={day}
                      className="text-center text-sm font-medium text-muted-foreground py-2"
                    >
                      {day}
                    </div>
                  ))}

                  {/* Calendar days */}
                  {/* Add empty cells for days before month starts */}
                  {Array.from({
                    length: calendarDays[0]?.getDay() || 0,
                  }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[100px]" />
                  ))}

                  {/* Render calendar days */}
                  {calendarDays.map((day) => {
                    const dayEvents = calendarEvents.filter((e) =>
                      isSameDay(new Date(e.event_date), day)
                    );
                    const isToday = isSameDay(day, new Date());

                    return (
                      <div
                        key={day.toString()}
                        className={`min-h-[100px] p-2 border rounded-lg ${
                          isToday ? "bg-primary/5 border-primary/30" : "bg-card"
                        }`}
                      >
                        <div
                          className={`text-sm font-medium mb-2 ${
                            isToday ? "text-primary" : ""
                          }`}
                        >
                          {format(day, "d")}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.map((event) => (
                            <div
                              key={event.id}
                              className={`text-xs p-1 rounded ${
                                EVENT_TYPE_COLORS[
                                  event.event_type as keyof typeof EVENT_TYPE_COLORS
                                ] || ""
                              }`}
                            >
                              <div className="flex items-center gap-1">
                                <EventTypeIcon type={event.event_type} />
                                <span className="truncate">{event.title}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}