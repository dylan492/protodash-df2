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
    
    const { data, error } = await supabaseAdmin
      .from("custodian_access")
      .update(body)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating custodian access:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Fatal error updating custodian access:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseAdmin = getAdminClient();
    console.log(`[DELETE] Attempting to delete custodian access with ID: ${params.id}`);
    
    const { data, error } = await supabaseAdmin
      .from("custodian_access")
      .delete()
      .eq("id", params.id)
      .select();

    console.log(`[DELETE] Delete result:`, { data, error });

    if (error) {
      console.error("Error deleting custodian access:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log(`[DELETE] Successfully deleted custodian access`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Fatal error deleting custodian access:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}