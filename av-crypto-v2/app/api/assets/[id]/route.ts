import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseAdmin = getAdminClient();
    const body = await request.json();
    const { id } = params;

    console.log("API: Updating asset", id, "with data:", body);

    const { data, error } = await supabaseAdmin
      .from("assets")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("API: Update error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log("API: Update successful:", data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("API: Unexpected error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}